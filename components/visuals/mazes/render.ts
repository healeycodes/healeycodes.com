import { Cell, Maze } from "./maze";

const NODE_RADIUS = (cellSize: number) => cellSize / 6;

export function renderWhiteCell(
  maze: Maze,
  cell: Cell,
  ctx: CanvasRenderingContext2D,
) {
  const canvas = ctx.canvas;
  const { width, height } = maze;

  if (width !== height) {
    throw new Error("Maze must be square to render properly.");
  }

  const cellSize = canvas.width / width;

  const left = cell.x * cellSize;
  const top = cell.y * cellSize;

  ctx.fillStyle = "white";
  ctx.fillRect(left, top, cellSize, cellSize);

  // TODO: too much code to draw a rectangle!
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + cellSize, top);
  ctx.moveTo(left + cellSize, top);
  ctx.lineTo(left + cellSize, top + cellSize);
  ctx.moveTo(left, top + cellSize);
  ctx.lineTo(left + cellSize, top + cellSize);
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + cellSize);
  ctx.stroke();
}

export function renderCellName(
  maze: Maze,
  cell: Cell,
  name: string,
  ctx: CanvasRenderingContext2D,
) {
  const canvas = ctx.canvas;
  const { width, height } = maze;

  if (width !== height) {
    throw new Error("Maze must be square to render properly.");
  }

  const cellSize = canvas.width / width;

  const left = cell.x * cellSize;
  const top = cell.y * cellSize;

  const centerX = left + cellSize / 2;
  const centerY = top + cellSize / 2;

  ctx.beginPath();
  ctx.arc(centerX, centerY, cellSize / 2.5, 0, 2 * Math.PI);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.strokeStyle = "royalblue";
  ctx.stroke();

  ctx.fillStyle = "royalblue";
  ctx.font = `${NODE_RADIUS(cellSize) * 4}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    name,
    left + cellSize / 2,
    top + cellSize / 2,
  );
}

export function renderMaze(
  maze: Maze,
  currentCell: Cell | null,
  currentPath: Cell[],
  ctx: CanvasRenderingContext2D,
) {
  const canvas = ctx.canvas;
  const { width, height } = maze;

  if (width !== height) {
    throw new Error("Maze must be square to render properly.");
  }

  // Clear the canvas
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Determine the size of each cell
  const cellSize = canvas.width / width;

  // Draw the maze
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = maze.getCell(x, y);

      if (cell) {
        const left = x * cellSize;
        const top = y * cellSize;

        // Check if the cell has zero edges
        if (cell.edges.length === 0) {
          // Fill the cell with black if it has zero edges
          ctx.fillStyle = "black";
          // Or grey if we're displaying a path
          if (currentPath.includes(cell)) {
            ctx.fillStyle = "grey";
          }
          ctx.fillRect(left, top, cellSize, cellSize);
        } else {
          // Draw the cell's borders if it has at least one edge
          ctx.beginPath();
          // Top border
          if (
            !cell.edges.find((cell) => cell === maze.getCell(x, y - 1))
          ) {
            ctx.moveTo(left, top);
            ctx.lineTo(left + cellSize, top);
          }
          // Right border
          if (
            !cell.edges.find((cell) => cell === maze.getCell(x + 1, y))
          ) {
            ctx.moveTo(left + cellSize, top);
            ctx.lineTo(left + cellSize, top + cellSize);
          }
          // Bottom border
          if (
            !cell.edges.find((cell) => cell === maze.getCell(x, y + 1))
          ) {
            ctx.moveTo(left, top + cellSize);
            ctx.lineTo(left + cellSize, top + cellSize);
          }
          // Left border
          if (
            !cell.edges.find((cell) => cell === maze.getCell(x - 1, y))
          ) {
            ctx.moveTo(left, top);
            ctx.lineTo(left, top + cellSize);
          }
          ctx.stroke();
        }

        // Current cell
        if (currentCell === cell) {
          const centerX = left + cellSize / 2;
          const centerY = top + cellSize / 2;

          ctx.beginPath();
          ctx.arc(centerX, centerY, NODE_RADIUS(cellSize), 0, 2 * Math.PI);
          ctx.fillStyle = "firebrick";
          ctx.fill();
        }

        if (cell === maze.start || cell === maze.end) {
          ctx.fillStyle = "black";
          ctx.font = `${NODE_RADIUS(cellSize) * 2}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            cell === maze.start ? "S" : "E",
            left + cellSize / 2,
            top + cellSize / 2,
          );
        }
      }
    }
  }
}

export function renderBFSOverlay(
  maze: Maze,
  visited: Set<Cell>,
  ctx: CanvasRenderingContext2D,
) {
  const canvas = ctx.canvas;
  const { width, height } = maze;

  if (width !== height) {
    throw new Error("Maze must be square to render properly.");
  }

  // Determine the size of each cell
  const cellSize = canvas.width / width;

  // Draw the visted nodes and its edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = maze.getCell(x, y);

      if (visited.has(cell)) {
        const centerX = x * cellSize + cellSize / 2;
        const centerY = y * cellSize + cellSize / 2;

        // Draw blue edges to connected nodes
        ctx.strokeStyle = "royalblue";
        ctx.lineWidth = 1;

        cell.edges.filter((edge) => visited.has(edge)).forEach((edge) => {
          const neighborX = edge.x * cellSize + cellSize / 2;
          const neighborY = edge.y * cellSize + cellSize / 2;

          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(neighborX, neighborY);
          ctx.stroke();
        });

        // Draw the node
        ctx.beginPath();
        ctx.arc(centerX, centerY, NODE_RADIUS(cellSize), 0, 2 * Math.PI);
        ctx.fillStyle = "royalblue";
        ctx.fill();
      }
    }
  }
}

export async function renderDebug(
  maze: Maze,
  currentCell: Cell,
  currentPath: Cell[],
  ctx: CanvasRenderingContext2D,
) {
  const canvas = ctx.canvas;
  const { width, height } = maze;

  if (width !== height) {
    throw new Error("Maze must be square to render properly.");
  }

  // Clear the canvas
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Determine the size of each cell
  const cellSize = canvas.width / width;

  // Draw the maze nodes and edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = maze.getCell(x, y);

      if (cell) {
        const centerX = x * cellSize + cellSize / 2;
        const centerY = y * cellSize + cellSize / 2;

        // Draw grey edges to path nodes
        if (currentPath.includes(cell)) {
          cell.neighbors.forEach((neighbor) => {
            if (currentPath.includes(neighbor)) {
              ctx.strokeStyle = "grey";
              ctx.lineWidth = 1;

              const neighborX = neighbor.x * cellSize + cellSize / 2;
              const neighborY = neighbor.y * cellSize + cellSize / 2;

              ctx.beginPath();
              ctx.moveTo(centerX, centerY);
              ctx.lineTo(neighborX, neighborY);
              ctx.stroke();
            }
          });
        }

        // Draw blue edges to connected nodes
        ctx.strokeStyle = "royalblue";
        ctx.lineWidth = 1;

        cell.edges.forEach((edge) => {
          const neighborX = edge.x * cellSize + cellSize / 2;
          const neighborY = edge.y * cellSize + cellSize / 2;

          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(neighborX, neighborY);
          ctx.stroke();
        });

        // Draw the node
        ctx.beginPath();
        ctx.arc(centerX, centerY, NODE_RADIUS(cellSize), 0, 2 * Math.PI);

        if (cell.edges.length === 0) {
          // Grey circle for unconnected nodes
          ctx.fillStyle = "grey";
        } else {
          // Red circle for connected nodes
          ctx.fillStyle = "royalblue";
        }

        ctx.fill();

        if (currentCell === cell) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, NODE_RADIUS(cellSize), 0, 2 * Math.PI);
          ctx.fillStyle = "firebrick";
          ctx.fill();
        }
      }
    }
  }
}
