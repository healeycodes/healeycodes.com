// Run tests with:
//   bun ./components/visuals/pips/components.tsx

import { useEffect, useState, useRef } from "react";

type Pip = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type DominoType = `${Pip}|${Pip}`;
type DominoCounts = Record<DominoType, number>;
type Coord = [number, number];
type Region =
    | { kind: 'sum', target: number, cells: Coord[] }
    | { kind: 'equal', cells: Coord[] }
    | { kind: 'nequal', cells: Coord[] }
    | { kind: 'less', target: number, cells: Coord[] }
    | { kind: 'greater', target: number, cells: Coord[] }

type DominoForUI = {
    position: Coord,
    orientation: 'horizontal' | 'vertical',
    pips: [Pip, Pip]
}
type VisualRegion = {
    cells: Coord[];
    color: string; // e.g., 'rgba(255, 0, 0, 0.3)' for background
    borderColor: string; // e.g., '#ff0000' for border
    symbol?: string; // e.g., '>4', '18', '=' - displayed in bottom-right corner
}

type TreeNode = {
    id: number;
    parentId: number | null;
    depth: number;
    children: number[];
}

type PuzzleDefinition = {
    title?: string;
    cells: Coord[];
    regions: Region[];
    dominos: DominoCounts;
}

type OptimizationFlags = {
    AVOID_CREATING_ISOLATED_CELLS: boolean;
    SKIP_DUPLICATE_DOMINOES: boolean;
    VERIFY_REGIONS_ARE_SOLVABLE: boolean;
}

const BasicTest: PuzzleDefinition = {
    cells: [
        [0, 1], [0, 2],
        [1, 1], [1, 2],
    ],
    regions: [
        { kind: 'sum', target: 4, cells: [[1, 1], [1, 2]] },
    ],
    dominos: {
        '2|2': 1, '1|2': 1,
    } as DominoCounts
};

const EqualRegionTest: PuzzleDefinition = {
    cells: [
        [0, 0], [0, 1],
        [1, 0], [1, 1],
    ],
    regions: [
        { kind: 'equal', cells: [[0, 0], [0, 1]] }, // Both cells must be equal
        { kind: 'equal', cells: [[1, 0], [1, 1]] }, // Both cells must be equal
    ],
    dominos: {
        '3|3': 1, '1|1': 1,
    } as DominoCounts
};

const NotEqualRegionTest: PuzzleDefinition = {
    cells: [
        [0, 0], [0, 1], [0, 2],
        [1, 0], [1, 1], [1, 2],
    ],
    regions: [
        { kind: 'nequal', cells: [[0, 0], [0, 1], [0, 2]] }, // All different
        { kind: 'nequal', cells: [[1, 0], [1, 1], [1, 2]] }, // All different
    ],
    dominos: {
        '1|2': 1, '3|4': 1, '5|6': 1,
    } as DominoCounts
};

const LessThanRegionTest: PuzzleDefinition = {
    cells: [
        [0, 0], [0, 1],
        [1, 0], [1, 1],
    ],
    regions: [
        { kind: 'less', target: 3, cells: [[0, 0], [0, 1]] }, // All values < 3
        { kind: 'less', target: 2, cells: [[1, 0], [1, 1]] }, // All values < 2
    ],
    dominos: {
        '1|2': 1, '0|1': 1,
    } as DominoCounts
};

const GreaterThanRegionTest: PuzzleDefinition = {
    cells: [
        [0, 0], [0, 1],
        [1, 0], [1, 1],
    ],
    regions: [
        { kind: 'greater', target: 3, cells: [[0, 0], [0, 1]] }, // All values > 3
        { kind: 'greater', target: 2, cells: [[1, 0], [1, 1]] }, // All values > 2
    ],
    dominos: {
        '4|5': 1, '3|6': 1,
    } as DominoCounts
};

const MultiRegionTest: PuzzleDefinition = {
    cells: [
        [0, 0], [0, 1],
        [1, 0], [1, 1],
    ],
    regions: [
        { kind: 'sum', target: 5, cells: [[0, 0], [0, 1]] }, // Sum = 5 (1+4 or 2+3)
        { kind: 'sum', target: 5, cells: [[1, 0], [1, 1]] }, // Sum = 5 (remaining pieces)
    ],
    dominos: {
        '1|4': 1, '2|3': 1,
    } as DominoCounts
};

const AllConstraintTypesTest: PuzzleDefinition = {
    cells: [
        [0, 0], [0, 1], [0, 2], [0, 3],
        [1, 0], [1, 1], [1, 2], [1, 3],
    ],
    regions: [
        { kind: 'sum', target: 1, cells: [[0, 0], [0, 1]] }, // Sum = 1 (0+1)
        { kind: 'nequal', cells: [[0, 2], [0, 3]] }, // Different (2!=3)
        { kind: 'greater', target: 3, cells: [[1, 0], [1, 1]] }, // Both > 3 (4,5)
        { kind: 'less', target: 7, cells: [[1, 2], [1, 3]] }, // Both < 7 (1,6)
    ],
    dominos: {
        '0|1': 1, '2|3': 1, '4|5': 1, '1|6': 1,
    } as DominoCounts
};

const LShapeTest: PuzzleDefinition = {
    cells: [
        [0, 0], [0, 1],                 // Top row
        [1, 0], [1, 1],                 // Second row  
        [2, 0], [2, 1], [2, 2], [2, 3], // Bottom row (extends right)
    ],
    regions: [
        { kind: 'sum', target: 3, cells: [[0, 0], [0, 1]] }, // Top: sum = 3 (1+2)
        { kind: 'sum', target: 7, cells: [[1, 0], [1, 1]] }, // Middle: sum = 7 (3+4)
        { kind: 'sum', target: 11, cells: [[2, 0], [2, 1]] }, // Bottom left: sum = 11 (5+6)
        { kind: 'sum', target: 1, cells: [[2, 2], [2, 3]] }, // Bottom right: sum = 1 (0+1)
    ],
    dominos: {
        '1|2': 1, '3|4': 1, '5|6': 1, '0|1': 1,
    } as DominoCounts
};

const CrossShapeTest: PuzzleDefinition = {
    cells: [
        [0, 1], [0, 2],                 // Top row
        [1, 1], [1, 2],                 // Second row
        [2, 0], [2, 1], [2, 2], [2, 3], // Middle row (full width)
        [3, 1], [3, 2],                 // Bottom row
    ],
    regions: [
        { kind: 'sum', target: 2, cells: [[0, 1], [0, 2]] }, // Top: sum = 2 (1+1)
        { kind: 'sum', target: 4, cells: [[1, 1], [1, 2]] }, // Second: sum = 4 (2+2)
        { kind: 'sum', target: 6, cells: [[2, 0], [2, 1]] }, // Middle left: sum = 6 (3+3)
        { kind: 'sum', target: 8, cells: [[2, 2], [2, 3]] }, // Middle right: sum = 8 (4+4)
        { kind: 'sum', target: 11, cells: [[3, 1], [3, 2]] }, // Bottom: sum = 11 (5+6)
    ],
    dominos: {
        '1|1': 1, '2|2': 1, '3|3': 1, '4|4': 1, '5|6': 1,
    } as DominoCounts
};

const Easy14thOct25: PuzzleDefinition = {
    title: 'Easy 14th Oct 2025',
    cells: [
        [0, 0], [0, 3],
        [1, 0], [1, 1], [1, 2], [1, 3],
        [2, 0], [2, 1], [2, 2], [2, 3],
    ],
    regions: [
        { kind: 'greater', target: 3, cells: [[0, 3]] },
        { kind: 'equal', cells: [[1, 0], [1, 1], [1, 2], [1, 3],] },
        { kind: 'equal', cells: [[2, 0], [2, 1], [2, 2],] }
    ],
    dominos: {
        '5|6': 1, '3|4': 1, '6|6': 1, '2|3': 1, '3|3': 1,
    } as DominoCounts
};

const Hard15thOct25: PuzzleDefinition = {
    title: 'Hard 15th Oct 2025',
    cells: [
        [0, 0], [0, 1], [0, 2],
        [1, 0], [1, 2], [1, 5],
        [2, 0], [2, 1], [2, 2], [2, 5],
        [3, 0], [3, 5],
        [4, 0], [4, 5],
        [5, 1], [5, 2], [5, 3],
        [6, 1], [6, 3], [6, 6], [6, 7],
        [7, 1], [7, 2], [7, 3], [7, 6],
        [8, 1], [8, 6],
        [9, 1], [9, 5], [9, 6],
    ],
    regions: [
        { kind: 'sum', target: 8, cells: [[0, 0], [1, 0]] },
        { kind: 'sum', target: 2, cells: [[0, 1], [0, 2]] },
        { kind: 'sum', target: 4, cells: [[1, 2], [2, 2]] },
        { kind: 'greater', target: 3, cells: [[1, 5]] },
        { kind: 'sum', target: 10, cells: [[2, 0], [2, 1]] },
        { kind: 'sum', target: 0, cells: [[2, 5], [3, 5], [4, 5]] },
        { kind: 'sum', target: 4, cells: [[3, 0]] },
        { kind: 'greater', target: 1, cells: [[4, 0]] },
        { kind: 'sum', target: 9, cells: [[5, 1], [6, 1]] },
        { kind: 'sum', target: 2, cells: [[5, 2], [5, 3]] },
        { kind: 'sum', target: 1, cells: [[6, 3], [7, 3]] },
        { kind: 'equal', cells: [[6, 6], [7, 6]] },
        { kind: 'sum', target: 0, cells: [[6, 7]] },
        { kind: 'sum', target: 12, cells: [[7, 1], [8, 1]] },
        { kind: 'sum', target: 3, cells: [[7, 2]] },
        { kind: 'equal', cells: [[8, 6], [9, 5], [9, 6]] },
        { kind: 'sum', target: 2, cells: [[9, 1]] },
    ],
    dominos: {
        '0|6': 1, '1|4': 1, '2|4': 1, '4|6': 1, '0|2': 1,
        '4|5': 1, '0|0': 1, '2|3': 1, '1|5': 1, '1|3': 1,
        '0|1': 1, '0|3': 1, '2|5': 1, '3|3': 1, '2|6': 1,
    } as DominoCounts
};

const Medium14thOct25: PuzzleDefinition = {
    title: 'Medium 14th Oct 2025',
    cells: [
        [0, 0], [0, 1], [0, 2],
        [1, 0], [1, 2],
        [2, 0], [2, 1], [2, 2],
        [3, 0], [3, 2],
        [4, 0], [4, 2],
    ],
    regions: [
        { kind: 'sum', target: 5, cells: [[0, 0], [0, 1]] },
        { kind: 'sum', target: 9, cells: [[0, 2], [1, 2]] },
        { kind: 'sum', target: 9, cells: [[2, 0], [3, 0]] },
        { kind: 'equal', cells: [[2, 1], [2, 2], [3, 2]] },
        { kind: 'greater', target: 3, cells: [[4, 0]] },
    ],
    dominos: {
        '2|5': 1, '1|3': 1, '0|5': 1, '0|3': 1, '4|5': 1, '0|4': 1,
    } as DominoCounts
};

const Easy16thOct25: PuzzleDefinition = {
    title: 'Easy 16th Oct 2025',
    cells: [
        [0, 0], [0, 1], [0, 2], [0, 3],
        [1, 0],
        [2, 0], [2, 1], [2, 2], [2, 3],
        [3, 3],
        [4, 0], [4, 1], [4, 2], [4, 3],
    ],
    regions: [
        { kind: 'sum', target: 7, cells: [[0, 0], [1, 0]] },
        { kind: 'sum', target: 6, cells: [[0, 1], [0, 2]] },
        { kind: 'sum', target: 12, cells: [[2, 0], [2, 1]] },
        { kind: 'equal', cells: [[2, 2], [2, 3], [3, 3], [4, 3]] },
        { kind: 'less', target: 3, cells: [[4, 0]] },
    ],
    dominos: {
        '5|5': 1, '2|6': 1, '4|5': 1, '1|6': 1, '0|4': 1, '3|4': 1, '5|6': 1,
    } as DominoCounts
};

// TODO: debug why this can't be solved (transcription issue?)
// const Medium16thOct25: PuzzleDefinition = {
//     title: 'Medium 16th Oct 2025',
//     cells: [
//         [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
//         [1, 0], [1, 3], [1, 4],
//         [2, 0], [2, 1], [2, 2], [2, 3], [2, 4],
//         [3, 1], [3, 2], [3, 3], [3, 4],
//     ],
//     regions: [
//         { kind: 'equal', cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
//         { kind: 'sum', target: 21, cells: [[0, 3], [1, 3], [1, 4], [2, 4]] },
//         { kind: 'sum', target: 6, cells: [[2, 0], [2, 1], [2, 2]] },
//         { kind: 'equal', cells: [[3, 2], [3, 3], [3, 4]] },
//     ],
//     dominos: {
//         '4|5': 1, '1|2': 1, '2|3': 1, '2|5': 1, '6|6': 1, '5|6': 1, '1|3': 1, '1|1': 1,
//     } as DominoCounts
// };

const Hard16thOct25: PuzzleDefinition = {
    title: 'Hard 16th Oct 2025',
    cells: [
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
        [1, 1], [1, 3], [1, 4], [1, 5], [1, 6],
        [2, 1], [2, 2], [2, 3], [2, 4],
        [3, 0], [3, 1], [3, 2], [3, 3], [3, 4],
        [4, 2],
    ],
    regions: [
        { kind: 'sum', target: 5, cells: [[0, 1], [1, 1], [2, 1], [2, 2], [2, 3]] },
        { kind: 'equal', cells: [[0, 3], [0, 4], [0, 5]] },
        { kind: 'equal', cells: [[1, 3], [1, 4], [1, 5]] },
        { kind: 'less', target: 4, cells: [[1, 6]] },
        { kind: 'sum', target: 2, cells: [[2, 4], [3, 4]] },
        { kind: 'less', target: 4, cells: [[3, 0]] },
        { kind: 'equal', cells: [[3, 1], [3, 2], [4, 2]] },
    ],
    dominos: {
        '4|4': 1, '0|2': 1, '5|6': 1, '3|4': 1, '5|5': 1, '2|6': 1, '3|5': 1, '0|0': 1, '1|5': 1, '1|6': 1,
    } as DominoCounts
};

const cellKey = (r: number, c: number) => `${r},${c}`;
const canon = (a: Pip, b: Pip): DominoType =>
    (a <= b ? `${a}|${b}` : `${b}|${a}`);

// Generate adjacency list showing which cells are neighbors
// e.g.
// input cells: [ [ 0, 1 ], [ 0, 2 ], [ 1, 1 ], [ 1, 2 ] ]
// output neighbors: [ [ 1, 2 ], [ 3, 0 ], [ 3, 0 ], [ 2, 1 ] ]
// which describes the grid graph:
// (0,1) -- (0,2)
//   |        |
// (1,1) -- (1,2)
function buildCells(cells: Coord[]) {
    const idByKey = new Map<string, number>();
    cells.forEach(([r, c], i) => idByKey.set(cellKey(r, c), i));

    const M = cells.length;
    const neighbors: number[][] = Array.from({ length: M }, () => []);
    for (let i = 0; i < M; i++) {
        const [r, c] = cells[i];

        // Check all 4 cardinal neighbors
        for (const [rr, cc] of [[r, c + 1], [r + 1, c], [r, c - 1], [r - 1, c]]) {
            const hit = idByKey.get(cellKey(rr, cc));
            if (hit !== undefined) {
                neighbors[i].push(hit);
            }
        }
    }
    return { M, neighbors };
}

function buildRegions(cells: Coord[], regions: Region[]) {
    // Map board index by cell coordinate
    // e.g. 1,2 -> 0, etc.
    const idx = new Map<string, number>();
    cells.forEach(([r, c], i) => idx.set(cellKey(r, c), i));

    // Build a function that checks if the board satisfies all regions
    return (board: (Pip | null)[]) => {
        for (const r of regions) {

            // Using a partial (or complete) board, get the values
            // of the cells in that board for this specific region
            const vals = r.cells
                .map(([rr, cc]) => board[idx.get(cellKey(rr, cc))!])
                .filter((v): v is Pip => v !== null);

            if (r.kind === 'sum') {
                const sum = vals.reduce((a, b) => a + b, 0);

                // Prune if partial sum already exceeds target
                if (sum > r.target) return false;

                // When region filled, sum must match exactly
                if (vals.length === r.cells.length && sum !== r.target) return false;
            } else if (r.kind === 'equal') {
                if (vals.length > 1 && vals.some(v => v !== vals[0])) return false;
            } else if (r.kind === 'nequal') {
                if (new Set(vals).size !== vals.length) return false;
            } else if (r.kind === 'less') {
                if (vals.some(v => v >= r.target)) return false;
            } else if (r.kind === 'greater') {
                if (vals.some(v => v <= r.target)) return false;
            }
        }
        return true;
    };
}

async function solve(
    cells: Coord[],
    regions: Region[],
    dominos: DominoCounts,
    callback?: (cells: Coord[], dominoes: DominoForUI[], regions: Region[], nodes: number, dominoCounts: DominoCounts, solved: boolean, tree: Map<number, TreeNode>) => Promise<void>,
    flags?: OptimizationFlags,
) {
    const { M, neighbors } = buildCells(cells);
    const checkRegions = buildRegions(cells, regions);
    const board: (Pip | null)[] = Array(M).fill(null);
    const dominoPairs: [number, number][] = []; // Track which cells are paired as dominoes
    const remaining: DominoCounts = { ...dominos };
    let nodes = 0;
    let solved: Pip[] | null = null;

    // Tree tracking
    const tree = new Map<number, TreeNode>();
    let currentParentId: number = 0; // Start at root node
    let currentDepth = 0;

    // Initialize root node
    tree.set(0, { id: 0, parentId: null, depth: 0, children: [] });

    // Pick all possible pairs of neighboring cells to place a domino on
    function pickPairs(): [number, number][] {
        let i = -1;

        // Choose the first empty cell
        for (let k = 0; k < M; k++) {
            if (board[k] === null) {
                i = k;
                break;
            }
        }

        // No more cells to place a domino on
        // => we've solved the puzzle
        if (i < 0) { return [] }

        // Collect all empty neighbors
        const pairs: [number, number][] = [];
        for (let j of neighbors[i]) {
            if (board[j] === null) {
                pairs.push([i, j]);
            }
        }

        return pairs;
    }

    function place(i: number, a: Pip, j: number, b: Pip): boolean {
        nodes++;
        const t = canon(a, b);

        if (!remaining[t]) {
            // Can/when does this case happen?
            throw new Error("unreachable")
        }

        remaining[t]--;
        board[i] = a;
        board[j] = b;
        dominoPairs.push([i, j]); // Track this domino pair

        // Create new tree node
        const newNodeId = nodes;
        const parentId = currentParentId;
        const depth = currentDepth;
        tree.set(newNodeId, { id: newNodeId, parentId, depth, children: [] });

        // Add to parent's children
        const parent = tree.get(parentId);
        if (parent) {
            parent.children.push(newNodeId);
        }

        return true;
    }

    function unplace(i: number, a: Pip, j: number, b: Pip): void {
        remaining[canon(a, b)]++;
        board[i] = null;
        board[j] = null;
        // Remove the last domino pair (since we're backtracking)
        dominoPairs.pop();
    }

    const boardToDominosForUI = (board: (Pip | null)[]): DominoForUI[] => {
        const dominos: DominoForUI[] = [];
        for (const [i, j] of dominoPairs) {
            if (board[i] !== null && board[j] !== null) {
                const cellA = cells[i];
                const cellB = cells[j];
                const orientation = cellA[0] === cellB[0] ? 'horizontal' : 'vertical';
                dominos.push({ position: cellA, orientation, pips: [board[i]!, board[j]!] });
            }
        }
        return dominos;
    }

    function checks(board: (Pip | null)[]): boolean {
        if (!checkRegions(board)) return false;

        if (flags?.AVOID_CREATING_ISOLATED_CELLS && checkForIsolatedEmptyCells()) {
            return false;
        }

        if (flags?.VERIFY_REGIONS_ARE_SOLVABLE && !checkRegionsAreSolvable()) {
            return false;
        }

        return true;
    }

    function checkForIsolatedEmptyCells(): boolean {
        for (let i = 0; i < M; i++) {
            if (board[i] === null) {
                // Check if this empty cell has any empty neighbors
                const hasEmptyNeighbor = neighbors[i].some(j => board[j] === null);
                if (!hasEmptyNeighbor) {
                    return true; // Found an isolated empty cell
                }
            }
        }
        return false;
    }

    function checkRegionsAreSolvable(): boolean {
        // Get all available spare pips from remaining dominoes
        const sparePips: Pip[] = [];
        for (const t in remaining) {
            if (remaining[t] > 0) {
                const [a, b] = t.split('|').map(Number) as [Pip, Pip];
                for (let count = 0; count < remaining[t]; count++) {
                    sparePips.push(a, b);
                }
            }
        }

        // Map cell coordinate to board index
        const idx = new Map<string, number>();
        cells.forEach(([r, c], i) => idx.set(cellKey(r, c), i));

        for (const region of regions) {
            // Get values already placed in this region
            const placedVals = region.cells
                .map(([r, c]) => board[idx.get(cellKey(r, c))!])
                .filter((v): v is Pip => v !== null);

            // Count how many empty cells remain in this region
            const emptyCells = region.cells.length - placedVals.length;
            if (emptyCells === 0) continue; // Region already filled

            if (region.kind === 'equal') {
                // Only check if at least one cell has been placed
                if (placedVals.length > 0) {
                    const mustMatch = placedVals[0];
                    const availablePips = sparePips.filter(p => p === mustMatch);
                    if (availablePips.length < emptyCells) return false;
                }
            }
            else if (region.kind === 'nequal') {
                // Need enough unique values available that differ from placed values
                const uniqueAvailable = new Set(sparePips.filter(p => !placedVals.includes(p)));
                if (uniqueAvailable.size < emptyCells) return false;
            } else if (region.kind === 'sum') {
                const currentSum = placedVals.reduce((a, b) => a + b, 0);
                const needed = region.target - currentSum;
                // Check if we can make the needed sum with available pips
                const sorted = sparePips.slice().sort((a, b) => a - b);
                const minSum = sorted.slice(0, emptyCells).reduce((a, b) => a + b, 0);
                const maxSum = sorted.slice(-emptyCells).reduce((a, b) => a + b, 0);
                if (needed < minSum || needed > maxSum) return false;
            } else if (region.kind === 'less') {
                // Need enough pips that are < target
                const availableValidPips = sparePips.filter(p => p < region.target);
                if (availableValidPips.length < emptyCells) return false;
            } else if (region.kind === 'greater') {
                // Need enough pips that are > target
                const availableValidPips = sparePips.filter(p => p > region.target);
                if (availableValidPips.length < emptyCells) return false;
            }
        }

        return true;
    }

    async function dfs(): Promise<boolean> {
        if (board.every(x => x !== null)) {
            solved = board.slice() as Pip[];
            await callback?.(
                cells,
                boardToDominosForUI(board),
                regions,
                nodes,
                remaining,
                true,
                tree,
            );
            return true;
        }

        const pairs = pickPairs();
        if (pairs.length === 0) return false;

        // Try each possible pair
        for (const [i, j] of pairs) {
            for (const t in remaining) if (remaining[t] > 0) {
                const [a, b] = t.split('|').map(Number) as [Pip, Pip];
                // Orientation 1
                const savedParentId1 = currentParentId;
                const savedDepth1 = currentDepth;
                currentDepth = savedDepth1 + 1; // Increment depth before placing

                if (place(i, a, j, b)) {
                    currentParentId = nodes; // Update parent to the node we just created

                    await callback?.(
                        cells,
                        boardToDominosForUI(board),
                        regions,
                        nodes,
                        remaining,
                        false,
                        tree,
                    );

                    // Check rules first to trim the search space
                    // then continue searching
                    if (checks(board) && await dfs()) return true;

                    currentParentId = savedParentId1;
                    currentDepth = savedDepth1;
                    unplace(i, a, j, b);
                } else {
                    currentDepth = savedDepth1; // Restore depth if place failed
                }

                // Orientation 2
                if (!(flags?.SKIP_DUPLICATE_DOMINOES && a === b)) {
                    const savedParentId2 = currentParentId;
                    const savedDepth2 = currentDepth;
                    currentDepth = savedDepth2 + 1; // Increment depth before placing

                    if (place(i, b, j, a)) {
                        currentParentId = nodes; // Update parent to the node we just created

                        await callback?.(
                            cells,
                            boardToDominosForUI(board),
                            regions,
                            nodes,
                            remaining,
                            false,
                            tree,
                        );

                        if (checks(board) && await dfs()) return true;

                        currentParentId = savedParentId2;
                        currentDepth = savedDepth2;
                        unplace(i, b, j, a);
                    } else {
                        currentDepth = savedDepth2; // Restore depth if place failed
                    }
                }
            }
        }

        return false;
    }

    await dfs();
    return { solution: solved, cells, dominos: boardToDominosForUI(board), regions, nodes };
}

function regionToVisualRegion(regions: Region[]): VisualRegion[] {
    // Muted color schemes
    const colorSchemes = [
        { color: 'rgba(180, 120, 120, 0.5)', borderColor: '#a67c7c' }, // Muted red
        { color: 'rgba(120, 140, 180, 0.5)', borderColor: '#7c8cb4' }, // Muted blue
        { color: 'rgba(120, 180, 120, 0.5)', borderColor: '#7cb47c' }, // Muted green
        { color: 'rgba(180, 160, 120, 0.5)', borderColor: '#b4a07c' }, // Muted orange
        { color: 'rgba(160, 120, 180, 0.5)', borderColor: '#a07cb4' }, // Muted purple
        { color: 'rgba(180, 180, 120, 0.5)', borderColor: '#b4b47c' }, // Muted yellow
        { color: 'rgba(120, 180, 160, 0.5)', borderColor: '#7cb4a0' }, // Muted teal
        { color: 'rgba(180, 120, 160, 0.5)', borderColor: '#b47ca0' }, // Muted pink
    ];

    return regions.map((region, index) => {
        const scheme = colorSchemes[index % colorSchemes.length];

        let symbol: string;
        switch (region.kind) {
            case 'sum':
                symbol = region.target.toString();
                break;
            case 'equal':
                symbol = '=';
                break;
            case 'nequal':
                symbol = '≠';
                break;
            case 'less':
                symbol = `<${region.target}`;
                break;
            case 'greater':
                symbol = `>${region.target}`;
                break;
            default:
                symbol = '?';
        }

        return {
            cells: region.cells,
            color: scheme.color,
            borderColor: scheme.borderColor,
            symbol: symbol
        };
    });
}

export function Easy16thOct25Solver({ children, showCanvas = false, withOptimizations = false }: { children: React.ReactNode, showCanvas?: boolean, withOptimizations?: boolean }) {
    return Solver(Easy16thOct25, showCanvas, children, {
        AVOID_CREATING_ISOLATED_CELLS: withOptimizations,
        SKIP_DUPLICATE_DOMINOES: withOptimizations,
        VERIFY_REGIONS_ARE_SOLVABLE: withOptimizations,
    });
}

export function Medium14thOct25Solver({ children, showCanvas = false, withOptimizations = false }: { children: React.ReactNode, showCanvas?: boolean, withOptimizations?: boolean }) {
    return Solver(Medium14thOct25, showCanvas, children, {
        AVOID_CREATING_ISOLATED_CELLS: withOptimizations,
        SKIP_DUPLICATE_DOMINOES: withOptimizations,
        VERIFY_REGIONS_ARE_SOLVABLE: withOptimizations,
    });
}

export function Hard16thOct25Solver({ children, showCanvas = false, withOptimizations = false }: { children: React.ReactNode, showCanvas?: boolean, withOptimizations?: boolean }) {
    return Solver(Hard16thOct25, showCanvas, children, {
        AVOID_CREATING_ISOLATED_CELLS: withOptimizations,
        SKIP_DUPLICATE_DOMINOES: withOptimizations,
        VERIFY_REGIONS_ARE_SOLVABLE: withOptimizations,
    });
}

function Solver(puzzle: PuzzleDefinition, showCanvas: boolean, notes: React.ReactNode | null, flags: OptimizationFlags = {
    AVOID_CREATING_ISOLATED_CELLS: false,
    SKIP_DUPLICATE_DOMINOES: false,
    VERIFY_REGIONS_ARE_SOLVABLE: false,
}) {

    const [cells, setCells] = useState<Coord[]>([]);
    const [dominoes, setDominoes] = useState<DominoForUI[]>([]);
    const [regions, setRegions] = useState<VisualRegion[]>([]);
    const [dominoCounts, setDominoCounts] = useState<DominoCounts>({} as DominoCounts);
    const [maxNodes, setMaxNodes] = useState<number>(0);
    const [progress, setProgress] = useState<string>('Nodes: 0');
    const treeBufferRef = useRef<Map<number, TreeNode>[]>([]);

    useEffect(() => {
        solve(
            puzzle.cells,
            puzzle.regions,
            puzzle.dominos,
            undefined,
            flags
        ).then(({ nodes }) => {
            setMaxNodes(nodes);
        });
    }, [puzzle, flags]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            while (!cancelled) {
                await solve(
                    puzzle.cells,
                    puzzle.regions,
                    puzzle.dominos, async (cells, dominoes, regions, nodes, dominoCounts, solved, tree) => {
                        if (cancelled) return;

                        // Push tree to buffer for rendering
                        treeBufferRef.current.push(tree);
                        
                        setCells(cells);
                        setDominoes(dominoes);
                        setRegions(regionToVisualRegion(regions));
                        setProgress(`${nodes}/${maxNodes}`);
                        setDominoCounts(dominoCounts);
                        
                        await new Promise((resolve) => setTimeout(resolve, 150));
                        if (solved) {
                            await new Promise((resolve) => setTimeout(resolve, 3500));
                        }
                    }, flags);
            }
        })();

        return () => {
            cancelled = true;
        }
    }, [maxNodes]);

    return (
        <>
            {renderPips(puzzle.title || '<untitled>', progress, cells, dominoes, regions, dominoCounts)}
            {notes}
            {showCanvas && <GraphCanvas treeBufferRef={treeBufferRef} />}
        </>
    );
}

function GraphCanvas({ treeBufferRef }: { treeBufferRef: React.RefObject<Map<number, TreeNode>[]> }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const displayWidth = 350;
        const displayHeight = 250;
        const leftMargin = 35; // Space for the node count labels
        const topPadding = 8; // Space at the top
        const rightPadding = 8; // Space on the right

        // Handle retina displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        ctx.scale(dpr, dpr);

        let animationFrameId: number;

        const renderTree = (tree: Map<number, TreeNode>) => {
            // Clear canvas
            ctx.clearRect(0, 0, displayWidth, displayHeight);

            if (tree.size === 0) return;

            // Calculate layout positions for each node
            type NodePosition = { x: number; y: number };
            const positions = new Map<number, NodePosition>();

            // Group nodes by depth
            const nodesByDepth = new Map<number, number[]>();
            let maxDepth = 0;

            tree.forEach((node) => {
                if (!nodesByDepth.has(node.depth)) {
                    nodesByDepth.set(node.depth, []);
                }
                nodesByDepth.get(node.depth)!.push(node.id);
                maxDepth = Math.max(maxDepth, node.depth);
            });

            // Calculate vertical spacing (accounting for top padding)
            const availableHeight = displayHeight - topPadding - 10;
            const verticalSpacing = maxDepth > 0 ? Math.min(availableHeight / maxDepth, 30) : 0;

            // Position nodes using a simple layout
            const graphWidth = displayWidth - leftMargin - rightPadding;
            nodesByDepth.forEach((nodes, depth) => {
                const y = topPadding + 10 + depth * verticalSpacing;

                nodes.forEach((nodeId, index) => {
                    // Spread nodes across the available width (after left margin)
                    const x = leftMargin + (graphWidth / (nodes.length + 1)) * (index + 1);
                    positions.set(nodeId, { x, y });
                });
            });

            // Draw edges
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;

            tree.forEach((node) => {
                if (node.parentId !== null) {
                    const parentPos = positions.get(node.parentId);
                    const nodePos = positions.get(node.id);

                    if (parentPos && nodePos) {
                        ctx.beginPath();
                        ctx.moveTo(parentPos.x, parentPos.y);
                        ctx.lineTo(nodePos.x, nodePos.y);
                        ctx.stroke();
                    }
                }
            });

            // Draw nodes
            ctx.fillStyle = '#333';
            positions.forEach((pos) => {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 2, 0, 2 * Math.PI);
                ctx.fill();
            });

            // Draw node count labels on the left
            ctx.font = '12px monospace';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            nodesByDepth.forEach((nodes, depth) => {
                const y = topPadding + 10 + depth * verticalSpacing;
                const count = nodes.length.toString().padStart(4, ' ');
                ctx.fillText(count, leftMargin - 5, y);
            });
        };

        const animate = () => {
            // Get the latest tree from the buffer
            if (treeBufferRef.current && treeBufferRef.current.length > 0) {
                const latestTree = treeBufferRef.current[treeBufferRef.current.length - 1];
                renderTree(latestTree);
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [treeBufferRef]);

    return (
        <div className="graph-container">
            <canvas
                ref={canvasRef}
                style={{
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                }}
            />
            <style jsx>{`
                .graph-container {
                    display: flex;
                    justify-content: center;
                    padding: 8px;
                }
            `}</style>
        </div>
    );
}

function renderPips(
    title: string,
    progress: string,
    cells: Coord[],
    dominoes: DominoForUI[],
    regions: VisualRegion[],
    availableDominoCounts: DominoCounts
) {
    // Get dominoes that are actually in this puzzle, sorted in canonical order
    const puzzleDominoes = Object.keys(availableDominoCounts)
        .filter(type => availableDominoCounts[type as DominoType] >= 0) // Include both used and unused
        .map(type => {
            const [a, b] = type.split('|').map(Number) as [Pip, Pip];
            return { pips: [a, b] as [Pip, Pip], type: type as DominoType };
        })
        .sort((a, b) => {
            // Sort by sum first, then by first pip (canonical order)
            const sumA = a.pips[0] + a.pips[1];
            const sumB = b.pips[0] + b.pips[1];
            if (sumA !== sumB) return sumA - sumB;
            return a.pips[0] - b.pips[0];
        });

    // Create display slots showing available count for each domino
    const displaySlots = puzzleDominoes.map(domino => ({
        ...domino,
        available: availableDominoCounts[domino.type] > 0,
        count: availableDominoCounts[domino.type]
    }));

    // Helper function to find which region a cell belongs to
    const findCellRegion = (row: number, col: number): VisualRegion | null => {
        return regions.find(region =>
            region.cells.some(([r, c]) => r === row && c === col)
        ) || null;
    };

    // Helper function to find the bottom-right corner cell of a region
    const getRegionBottomRightCorner = (region: VisualRegion): Coord => {
        let maxRow = -1;
        let maxCol = -1;

        // Find the cell with the maximum row, and among those, the maximum column
        for (const [r, c] of region.cells) {
            if (r > maxRow || (r === maxRow && c > maxCol)) {
                maxRow = r;
                maxCol = c;
            }
        }

        return [maxRow, maxCol];
    };

    // Helper function to determine which borders a cell should have based on its region
    const getCellRegionBorders = (row: number, col: number, region: VisualRegion) => {
        const borders = { top: false, right: false, bottom: false, left: false };

        // Check each direction to see if the adjacent cell is in the same region
        const isInRegion = (r: number, c: number) =>
            region.cells.some(([rr, cc]) => rr === r && cc === c);

        // Top border if cell above is not in same region
        if (!isInRegion(row - 1, col)) borders.top = true;
        // Right border if cell to right is not in same region  
        if (!isInRegion(row, col + 1)) borders.right = true;
        // Bottom border if cell below is not in same region
        if (!isInRegion(row + 1, col)) borders.bottom = true;
        // Left border if cell to left is not in same region
        if (!isInRegion(row, col - 1)) borders.left = true;

        return borders;
    };

    const renderDots = (pips: number, isUnused = false) => {
        const patterns = [
            '', // 0
            'center', // 1
            'top-left bottom-right', // 2
            'top-left center bottom-right', // 3
            'top-left top-right bottom-left bottom-right', // 4
            'top-left top-right center bottom-left bottom-right', // 5
            'top-left top-right center-left center-right bottom-left bottom-right' // 6
        ];

        return patterns[pips]?.split(' ').filter(pos => pos).map((pos, i) => {
            const getPosition = (position: string) => {
                switch (position) {
                    case 'top-left': return { top: '6px', left: '6px' };
                    case 'top-right': return { top: '6px', right: '6px' };
                    case 'center': return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
                    case 'center-left': return { top: '50%', left: '6px', transform: 'translateY(-50%)' };
                    case 'center-right': return { top: '50%', right: '6px', transform: 'translateY(-50%)' };
                    case 'bottom-left': return { bottom: '6px', left: '6px' };
                    case 'bottom-right': return { bottom: '6px', right: '6px' };
                    default: return {};
                }
            };

            return (
                <div key={i} style={{
                    width: isUnused ? '4px' : '6px',
                    height: isUnused ? '4px' : '6px',
                    position: 'absolute',
                    borderRadius: '50%',
                    background: '#333',
                    ...getPosition(pos)
                }}></div>
            );
        }) || [];
    };

    // Calculate grid bounds from cells array
    // Handle empty cells array (initial load state)
    if (cells.length === 0) {
        return <div className="container">
            <div className="game-container">
                <div className="puzzle-info">
                    <div>Puzzle: {title}</div>
                    <div>Nodes: {progress}</div>
                </div>
                <div>Loading puzzle...</div>
            </div>
        </div>;
    }

    const minRow = Math.min(...cells.map(([r, c]) => r));
    const maxRow = Math.max(...cells.map(([r, c]) => r));
    const minCol = Math.min(...cells.map(([r, c]) => c));
    const maxCol = Math.max(...cells.map(([r, c]) => c));

    const gridRows = maxRow - minRow + 1;
    const gridCols = maxCol - minCol + 1;
    const totalCells = gridRows * gridCols;

    // Create a set for quick lookup of valid cells
    const validCells = new Set(cells.map(([r, c]) => `${r},${c}`));

    return <div className="container">
        <div className="game-container">
            <div className="puzzle-info">
                <div>Puzzle: {title}</div>
                <div>Nodes: {progress}</div>
            </div>
            <div className="pips-board" style={{
                position: 'relative',
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                width: `${gridCols * 47 + 12}px`, // 47px per cell + 12px padding
                height: `${gridRows * 47 + 12}px`
            }}>
                {Array(totalCells).fill(null).map((_, i) => {
                    const row = Math.floor(i / gridCols) + minRow;
                    const col = (i % gridCols) + minCol;

                    // Check if this cell exists in the puzzle
                    if (!validCells.has(`${row},${col}`)) {
                        return <div key={i} className="cell empty-cell"></div>;
                    }

                    // Check if this cell belongs to a region
                    const cellRegion = findCellRegion(row, col);
                    const regionBorders = cellRegion ? getCellRegionBorders(row, col, cellRegion) : null;

                    // Check if this cell is part of a domino
                    let isDominoCell = false;
                    for (const domino of dominoes) {
                        const [startRow, startCol] = domino.position;
                        if (domino.orientation === 'horizontal') {
                            if (row === startRow && (col === startCol || col === startCol + 1)) {
                                isDominoCell = true;
                                break;
                            }
                        } else if (domino.orientation === 'vertical') {
                            if (col === startCol && (row === startRow || row === startRow + 1)) {
                                isDominoCell = true;
                                break;
                            }
                        }
                    }

                    // Build region styling
                    const regionStyle: React.CSSProperties = {};
                    const regionClasses: string[] = [];
                    let regionOverlay: JSX.Element | null = null;

                    if (cellRegion && regionBorders) {
                        regionStyle.position = 'relative';
                        regionClasses.push('region-cell');

                        // Create region background that extends into gaps
                        const backgroundStyle: React.CSSProperties = {
                            position: 'absolute',
                            top: '-0.5px', // Half the grid gap (1px gap / 2)
                            left: '-0.5px',
                            right: '-0.5px',
                            bottom: '-0.5px',
                            backgroundColor: cellRegion.color,
                            pointerEvents: 'none',
                            zIndex: -2 // Behind borders
                        };

                        // Create region border overlay positioned outside the cell
                        // When a domino is present (with 2px border), we need to position further out
                        const borderOffset = isDominoCell ? '-4px' : '-2px';
                        const borderStyle: React.CSSProperties = {
                            position: 'absolute',
                            top: borderOffset,
                            left: borderOffset,
                            right: borderOffset,
                            bottom: borderOffset,
                            pointerEvents: 'none',
                            zIndex: -1,
                            borderRadius: '4px' // Match domino border radius
                        };

                        if (regionBorders.top) {
                            borderStyle.borderTopColor = cellRegion.borderColor;
                            borderStyle.borderTopWidth = '2.5px';
                            borderStyle.borderTopStyle = 'dashed';
                        }
                        if (regionBorders.right) {
                            borderStyle.borderRightColor = cellRegion.borderColor;
                            borderStyle.borderRightWidth = '2.5px';
                            borderStyle.borderRightStyle = 'dashed';
                        }
                        if (regionBorders.bottom) {
                            borderStyle.borderBottomColor = cellRegion.borderColor;
                            borderStyle.borderBottomWidth = '2.5px';
                            borderStyle.borderBottomStyle = 'dashed';
                        }
                        if (regionBorders.left) {
                            borderStyle.borderLeftColor = cellRegion.borderColor;
                            borderStyle.borderLeftWidth = '2.5px';
                            borderStyle.borderLeftStyle = 'dashed';
                        }

                        regionOverlay = (
                            <>
                                <div style={backgroundStyle} />
                                <div style={borderStyle} />
                            </>
                        );
                    }


                    // Check if this cell is part of a domino
                    for (const domino of dominoes) {
                        const [startRow, startCol] = domino.position;

                        if (domino.orientation === 'horizontal') {
                            if (row === startRow && col === startCol) {
                                return (
                                    <div key={i} className={`cell domino-left ${regionClasses.join(' ')}`} style={regionStyle}>
                                        {regionOverlay}
                                        {renderDots(domino.pips[0])}
                                    </div>
                                );
                            }
                            if (row === startRow && col === startCol + 1) {
                                return (
                                    <div key={i} className={`cell domino-right ${regionClasses.join(' ')}`} style={regionStyle}>
                                        {regionOverlay}
                                        {renderDots(domino.pips[1])}
                                    </div>
                                );
                            }
                        } else if (domino.orientation === 'vertical') {
                            if (row === startRow && col === startCol) {
                                return (
                                    <div key={i} className={`cell domino-top ${regionClasses.join(' ')}`} style={regionStyle}>
                                        {regionOverlay}
                                        {renderDots(domino.pips[0])}
                                    </div>
                                );
                            }
                            if (row === startRow + 1 && col === startCol) {
                                return (
                                    <div key={i} className={`cell domino-bottom ${regionClasses.join(' ')}`} style={regionStyle}>
                                        {regionOverlay}
                                        {renderDots(domino.pips[1])}
                                    </div>
                                );
                            }
                        }
                    }

                    return <div key={i} className={`cell ${regionClasses.join(' ')}`} style={regionStyle}>{regionOverlay}</div>;
                })}

                {/* Render region symbols on top of everything */}
                {regions.map((region, regionIndex) => {
                    if (!region.symbol) return null;

                    const [cornerRow, cornerCol] = getRegionBottomRightCorner(region);

                    // Calculate position based on dynamic grid layout
                    // Each cell is ~47px (35px + 1px gap + padding), starting at 6px padding
                    const cellSize = 47; // Approximate cell size including gap
                    const boardPadding = 6;
                    const left = boardPadding + (cornerCol - minCol + 1) * cellSize - 9; // Position at right edge (18px / 2)
                    const top = boardPadding + (cornerRow - minRow + 1) * cellSize - 9;  // Position at bottom edge (18px / 2)

                    const symbolStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: `${left}px`,
                        top: `${top}px`,
                        width: '18px',   // 25% smaller (24px * 0.75)
                        height: '18px',  // 25% smaller (24px * 0.75)
                        backgroundColor: region.borderColor,
                        transform: 'rotate(45deg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12.5px', // 25% bigger (10px * 1.25)
                        fontWeight: 'bold',
                        color: 'white',
                        zIndex: 20, // Higher than everything else
                        borderRadius: '2px', // Proportionally smaller
                        pointerEvents: 'none'
                    };

                    const textStyle: React.CSSProperties = {
                        transform: 'rotate(-45deg)',
                        lineHeight: '1',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                    };

                    return (
                        <div key={`symbol-${regionIndex}`} style={symbolStyle}>
                            <span style={textStyle}>{region.symbol}</span>
                        </div>
                    );
                })}
            </div>

            <div className="unused-dominoes">
                <div className="domino-slots">
                    {displaySlots.map((slot, i) => (
                        <div key={i} className={`unused-domino ${!slot.available ? 'domino-hole' : ''}`}>
                            {slot.available ? (
                                <>
                                    <div className="unused-half">
                                        {renderDots(slot.pips[0], true)}
                                    </div>
                                    <div className="unused-half">
                                        {renderDots(slot.pips[1], true)}
                                    </div>
                                </>
                            ) : (
                                <div className="domino-hole-content"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <style jsx>{`
            .container {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px 20px 0 20px;
            }
            
            .game-container {
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 8px;
                background-color: white;
            }
            
            .puzzle-info {
                margin-bottom: 16px;
                font-size: 14px;
                color: #666;
                line-height: 1.4;
                font-family: monospace;
            }
            
            .pips-board {
                display: grid;
                gap: 1px;
                padding: 6px;
                box-sizing: border-box;
                border-radius: 8px;
            }
            
            .cell {
                background-color: #e8e8e8;
                position: relative;
                border-radius: 2px;
                min-height: 35px;
                min-width: 35px;
            }
            
            .empty-cell {
                background-color: transparent;
                border: none;
            }
            
             .domino-left {
                 background-color: white;
                 border: 2px solid #333;
                 border-right: none;
                 border-radius: 4px;
                 border-top-right-radius: 0;
                 border-bottom-right-radius: 0;
                 position: relative;
             }
             
             .domino-left::after {
                 content: '';
                 position: absolute;
                 top: 20%;
                 right: 0;
                 bottom: 20%;
                 width: 1px;
                 background-color: #ccc;
             }
             
             .domino-right {
                 background-color: white;
                 border: 2px solid #333;
                 border-left: none;
                 border-radius: 4px;
                 border-top-left-radius: 0;
                 border-bottom-left-radius: 0;
                 position: relative;
             }
             
             .domino-top {
                 background-color: white;
                 border: 2px solid #333;
                 border-bottom: none;
                 border-radius: 4px;
                 border-bottom-left-radius: 0;
                 border-bottom-right-radius: 0;
                 position: relative;
             }
             
             .domino-top::after {
                 content: '';
                 position: absolute;
                 left: 20%;
                 right: 20%;
                 bottom: 0;
                 height: 1px;
                 background-color: #ccc;
             }
             
             .domino-bottom {
                 background-color: white;
                 border: 2px solid #333;
                 border-top: none;
                 border-radius: 4px;
                 border-top-left-radius: 0;
                 border-top-right-radius: 0;
                 position: relative;
             }
             
             .unused-dominoes {
                 margin-top: 0;
                 text-align: center;
             }
             
             .domino-slots {
                 display: grid;
                 grid-template-columns: repeat(4, 1fr);
                 gap: 8px;
                 width: 292px;
                 padding: 10px;
                 border-radius: 6px;
             }
             
             .unused-domino {
                 display: flex;
                 background-color: white;
                 border: 2px solid #333;
                 border-radius: 4px;
                 height: 30px;
                 min-height: 30px;
             }
             
             .unused-half {
                 flex: 1;
                 position: relative;
                 border-radius: 2px;
             }
             
             .unused-half:first-child {
                 border-right: none;
                 position: relative;
             }
             
             .unused-half:first-child::after {
                 content: '';
                 position: absolute;
                 top: 20%;
                 right: 0;
                 bottom: 20%;
                 width: 1px;
                 background-color: #ccc;
             }
             
             .domino-hole {
                 background-color: rgb(245, 239, 238);
                 border: none;
             }
             
             .domino-hole-content {
                 width: 100%;
                 height: 100%;
                 display: flex;
                 align-items: center;
                 justify-content: center;
             }
            
            .dot {
                width: 12px;
                height: 12px;
                min-height: 12px;
                min-width: 12px;
                position: absolute;
                border-radius: 50%;
                background: #333;
                z-index: 10;
                border: 1px solid red;
                display: block;
                box-sizing: border-box;
            }
            
            .dot.top-left {
                top: 6px;
                left: 6px;
            }
            
            .dot.top-right {
                top: 6px;
                right: 6px;
            }
            
            .dot.center {
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            
            .dot.center-left {
                top: 50%;
                left: 6px;
                transform: translateY(-50%);
            }
            
            .dot.center-right {
                top: 50%;
                right: 6px;
                transform: translateY(-50%);
            }
            
            .dot.bottom-left {
                bottom: 6px;
                left: 6px;
            }
            
            .dot.bottom-right {
                bottom: 6px;
                right: 6px;
            }
            
            .region-cell {
                z-index: 0; /* Keep regions behind dominoes */
            }
            
            /* Ensure domino borders stay visible above regions */
            .domino-left, .domino-right, .domino-top, .domino-bottom {
                z-index: 2; /* Higher than regions */
            }
            
            /* Border radius for region corners */
            .region-cell {
                border-radius: 0;
            }
            
            /* Apply border radius to outer corners of regions */
            .cell {
                border-radius: 2px;
            }
            
            .region-cell {
                border-radius: 6px;
            }
        `}</style>
    </div>
}

async function test() {
    // Basic test
    if ((await solve(BasicTest.cells, BasicTest.regions, BasicTest.dominos)).solution === null) {
        throw new Error("Basic test failed")
    }

    // Test 2: Equal region constraint
    const result2 = await solve(EqualRegionTest.cells, EqualRegionTest.regions, EqualRegionTest.dominos);
    if (result2.solution === null) {
        throw new Error("Equal region test failed")
    }

    // Test 3: Not-equal region constraint
    const result3 = await solve(NotEqualRegionTest.cells, NotEqualRegionTest.regions, NotEqualRegionTest.dominos);
    if (result3.solution === null) {
        throw new Error("Not-equal region test failed")
    }

    // Test 4: Less-than region constraint
    const result4 = await solve(LessThanRegionTest.cells, LessThanRegionTest.regions, LessThanRegionTest.dominos);
    if (result4.solution === null) {
        throw new Error("Less-than region test failed")
    }

    // Test 5: Greater-than region constraint
    const result5 = await solve(GreaterThanRegionTest.cells, GreaterThanRegionTest.regions, GreaterThanRegionTest.dominos);
    if (result5.solution === null) {
        throw new Error("Greater-than region test failed")
    }

    // Test 6: Multi-region puzzle
    const result6 = await solve(MultiRegionTest.cells, MultiRegionTest.regions, MultiRegionTest.dominos);
    if (result6.solution === null) {
        throw new Error("Multi-region test failed")
    }

    // Test 7: All constraint types
    const result7 = await solve(AllConstraintTypesTest.cells, AllConstraintTypesTest.regions, AllConstraintTypesTest.dominos);
    if (result7.solution === null) {
        throw new Error("All constraint types test failed")
    }

    // Test 8: L-shape
    const result8 = await solve(LShapeTest.cells, LShapeTest.regions, LShapeTest.dominos);
    if (result8.solution === null) {
        throw new Error("L-shaped grid test failed")
    }

    // Test 9: Cross shape
    const result9 = await solve(CrossShapeTest.cells, CrossShapeTest.regions, CrossShapeTest.dominos);
    if (result9.solution === null) {
        throw new Error("Cross-shaped grid test failed")
    }

    // Test 10: Easy 14th October 2025
    const result10 = await solve(Easy14thOct25.cells, Easy14thOct25.regions, Easy14thOct25.dominos);
    if (result10.solution === null) {
        throw new Error("Easy 14th October 2025 test failed")
    }
    console.log(`easy ${result10.nodes} nodes`)

    // Test 11: Medium 14th October 2025
    const result11 = await solve(Medium14thOct25.cells, Medium14thOct25.regions, Medium14thOct25.dominos);
    if (result11.solution === null) {
        throw new Error("Medium 14th October 2025 test failed")
    }
    console.log(`medium ${result11.nodes} nodes`)

    // Test 12: Hard 15th October 2025
    const result12 = await solve(Hard15thOct25.cells, Hard15thOct25.regions, Hard15thOct25.dominos);
    if (result12.solution === null) {
        throw new Error("Hard 15th October 2025 test failed")
    }
    console.log(`hard ${result12.nodes} nodes`)

    // Test 13: Easy 16th October 2025
    const result13 = await solve(Easy16thOct25.cells, Easy16thOct25.regions, Easy16thOct25.dominos);
    if (result13.solution === null) {
        throw new Error("Easy 16th October 2025 test failed")
    }
    console.log(`easy ${result13.nodes} nodes`)

    // Test 14: Hard 16th October 2025
    const result14 = await solve(Hard16thOct25.cells, Hard16thOct25.regions, Hard16thOct25.dominos);
    if (result14.solution === null) {
        throw new Error("Hard 16th October 2025 test failed")
    }
    console.log(`hard ${result14.nodes} nodes`)

    // Scratchpad
    const r = await solve(
        Hard16thOct25.cells,
        Hard16thOct25.regions,
        Hard16thOct25.dominos,
        undefined,
        {
            AVOID_CREATING_ISOLATED_CELLS: true,
            SKIP_DUPLICATE_DOMINOES: true,
            VERIFY_REGIONS_ARE_SOLVABLE: true,
        });
    console.log(`scratchpad ${r.nodes} nodes`)
    
    console.log("All tests passed")
}

if ('Bun' in globalThis && globalThis.Bun.main.includes('pips')) {
    test()
}
