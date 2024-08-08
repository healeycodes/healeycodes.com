import { Cell, Maze } from "./maze";
import { renderBFSOverlay, renderCellName, renderMaze } from "./render";

type Wall = { a: Cell; b: Cell };

export const shuffle = <T>(arr: T[]): T[] =>
  arr.sort(() => Math.random() - 0.5);

export const randomMember = <T>(group: Set<T> | T[]): T => {
  if (
    group instanceof Set && group.size === 0 ||
    group instanceof Array && group.length === 0
  ) {
    throw new Error("empty group");
  }
  const items = group instanceof Set ? Array.from(group) : group;
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
};

export function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

export function timeoutWithCancel(time: number, signal: AbortSignal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, time);

    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    });
  });
}

async function bfsFurthestCell(
  maze: Maze,
  start: Cell,
  ctx: CanvasRenderingContext2D,
  stepTime: number,
  withDraw: boolean,
  startCellName: false | string,
  endCellName: false | string,
): Promise<{ furthestCell: Cell; distance: number }> {
  let maxDist = 0;
  let furthestCell = start;
  const queue: { cell: Cell; dist: number }[] = [{ cell: start, dist: 0 }];
  const visited = new Set<Cell>();
  visited.add(start);

  while (queue.length > 0) {
    if (withDraw) {
      renderMaze(maze, null, [], ctx);
      renderBFSOverlay(maze, visited, ctx);

      if (startCellName) {
        renderCellName(maze, start, startCellName, ctx);
      }

      await new Promise((r) => setTimeout(r, stepTime));
    }

    const { cell, dist } = queue.shift();
    if (dist > maxDist) {
      maxDist = dist;
      furthestCell = cell;
    }
    for (const neighbor of cell.edges) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ cell: neighbor, dist: dist + 1 });
      }
    }
  }

  if (endCellName) {
    renderCellName(maze, furthestCell, endCellName, ctx);
  }

  return { furthestCell, distance: maxDist };
}

export async function findFurthestCells(
  maze: Maze,
  ctx: CanvasRenderingContext2D,
  stepTime: number,
  withDraw: boolean,
): Promise<{ cell1: Cell; cell2: Cell; distance: number }> {
  const startCell = randomMember(maze.cells.flat());
  if (!startCell) throw new Error("Invalid starting cell");

  const { furthestCell: cell1 } = await bfsFurthestCell(
    maze,
    startCell,
    ctx,
    stepTime,
    withDraw,
    withDraw && "A",
    withDraw && "B",
  );
  const { furthestCell: cell2, distance } = await bfsFurthestCell(
    maze,
    cell1,
    ctx,
    stepTime,
    withDraw,
    withDraw && "B",
    withDraw && "C",
  );

  return { cell1, cell2, distance };
}
