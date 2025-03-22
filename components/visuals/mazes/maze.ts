import { randomMember, shuffle } from ".";

export class Cell {
  x: number;
  y: number;
  edges: Cell[];
  neighbors: Cell[];

  constructor(
    x: number,
    y: number,
    neighbors: Cell[] = [],
  ) {
    this.x = x;
    this.y = y;
    this.neighbors = neighbors;
    this.edges = [];
  }

  carveEdge(neighbor: Cell) {
    this.edges.push(neighbor);
    neighbor.edges.push(this);
    return neighbor;
  }

  uncarvedEdges(): Cell[] {
    return this.neighbors.filter((neighbor) =>
      !this.edges.find((cell) => cell === neighbor)
    );
  }
}

export class Maze {
  width: number;
  height: number;
  cells: Cell[][];
  start: Cell | null;
  end: Cell | null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = [];

    // Generate cells
    for (let y = 0; y < height; y++) {
      this.cells[y] = [];
      for (let x = 0; x < width; x++) {
        this.cells[y][x] = new Cell(x, y);
      }
    }

    // Set up neighbors
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = this.cells[y][x];
        if (x > 0) cell.neighbors.push(this.cells[y][x - 1]); // left
        if (x < width - 1) cell.neighbors.push(this.cells[y][x + 1]); // right
        if (y > 0) cell.neighbors.push(this.cells[y - 1][x]); // top
        if (y < height - 1) cell.neighbors.push(this.cells[y + 1][x]); // bottom
      }
    }
  }

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.cells[y][x];
  }
}

export function solveMazeWithRandomDPS(maze: Maze) {
  const visited = new Set<string>();
  async function visit(last: Cell, x: number, y: number) {
    const coord = `${x},${y}`;
    if (visited.has(coord)) {
      return;
    }
    visited.add(`${x},${y}`);

    const current = maze.getCell(x, y);
    if (!current) {
      return
    }
    
    current.carveEdge(last);

    const neighbors: Cell[] = shuffle(current.uncarvedEdges());
    for (const neighbor of neighbors) {
      visit(current, neighbor.x, neighbor.y);
    }
  }

  const rndCell = randomMember(maze.cells.flat());
  visit(rndCell, rndCell.x, rndCell.y);
}
