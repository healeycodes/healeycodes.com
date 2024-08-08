import React, { useEffect, useRef, useState } from 'react';
import { Cell, Maze, solveMazeWithRandomDPS } from './maze';
import { renderDebug, renderMaze, renderWhiteCell } from './render';
import { findFurthestCells, randomMember, shuffle, sleep, timeoutWithCancel } from '.';
import { highResCanvasCtx } from '../../utils';

const FINISHED_MAZE_WAIT_FACTOR = 10;

async function aldousBroder(maze: Maze, ctx: CanvasRenderingContext2D, cancelSignal: AbortSignal, stepTime: number) {
    const visited = new Set();

    let current = randomMember(maze.cells.flat());
    visited.add(current);

    while (visited.size < maze.width * maze.height) {
        const next = shuffle(current.neighbors)[0];

        if (!visited.has(next)) {
            current.carveEdge(next);
            visited.add(next);
        }

        current = next;

        renderMaze(maze, current, [], ctx);
        await timeoutWithCancel(stepTime, cancelSignal)
    }

    const { cell1, cell2 } = await findFurthestCells(maze, ctx, stepTime, false);
    maze.start = cell1;
    maze.end = cell2;
    renderMaze(maze, null, [], ctx);
    await timeoutWithCancel(stepTime * FINISHED_MAZE_WAIT_FACTOR, cancelSignal)
}

async function randomDFS(maze: Maze, ctx: CanvasRenderingContext2D, cancelSignal: AbortSignal, stepTime: number) {
    const visited = new Set<Cell>();

    async function visit(last: Cell, next: Cell) {
        if (visited.has(next)) {
            return;
        }
        visited.add(next);

        last.carveEdge(next);
        renderMaze(maze, next, [], ctx);
        await timeoutWithCancel(stepTime, cancelSignal)

        const neighbors = shuffle(next.uncarvedEdges());
        for (const neighbor of neighbors) {
            await visit(next, neighbor);
        }
    }

    const rndCell = randomMember(maze.cells.flat());
    await visit(rndCell, shuffle(rndCell.neighbors)[0]);

    const { cell1, cell2 } = await findFurthestCells(maze, ctx, stepTime, false);
    maze.start = cell1;
    maze.end = cell2;
    renderMaze(maze, null, [], ctx);
    await timeoutWithCancel(stepTime * FINISHED_MAZE_WAIT_FACTOR, cancelSignal)
}

async function wilsonsAlgorithm(maze: Maze, ctx: CanvasRenderingContext2D, cancelSignal: AbortSignal, stepTime: number) {
    const unvisited = new Set<Cell>(maze.cells.flat());
    const visited = new Set<Cell>();

    // Choose one cell arbitrarily, add it to the maze, and mark it as visited
    const startCell = randomMember(maze.cells.flat())
    visited.add(startCell);
    unvisited.delete(startCell);

    // Continue until all cells have been visited
    while (unvisited.size > 0) {
        let path = [];
        let current = randomMember(unvisited);

        // Perform a random walk until reaching a cell already in the maze
        while (!visited.has(current)) {
            path.push(current);
            let next = randomMember(current.uncarvedEdges());

            // If a loop is formed, erase that section of the path
            const loopIndex = path.indexOf(next);
            if (loopIndex !== -1) {
                path = path.slice(0, loopIndex + 1);
            } else {
                path.push(next);
            }

            renderMaze(maze, next, path, ctx);
            if (visited.size === 1) {
                renderWhiteCell(maze, startCell, ctx)
            }
            await timeoutWithCancel(stepTime, cancelSignal)

            current = next;
        }

        // Add the path to the maze by carving edges and marking cells as visited
        for (let i = 0; i < path.length - 1; i++) {
            const cell = path[i];
            const nextCell = path[i + 1];
            cell.carveEdge(nextCell);
            visited.add(cell);
            unvisited.delete(cell);
        }
    }

    const { cell1, cell2 } = await findFurthestCells(maze, ctx, stepTime, false);
    maze.start = cell1;
    maze.end = cell2;
    renderMaze(maze, null, [], ctx);
    await timeoutWithCancel(stepTime * FINISHED_MAZE_WAIT_FACTOR, cancelSignal)
}

const componentForMaze = (mazeFunction: (maze: Maze, ctx: CanvasRenderingContext2D, cancelSignal: AbortSignal, stepTime: number) => void) => {
    return () => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [stepTime, setStepTime] = useState(150);
        const [mazeSize, setMazeSize] = useState(11);

        useEffect(() => {
            const controller = new AbortController();
            const { signal: cancelSignal } = controller;
            const canvas = canvasRef.current;

            if (!canvas) return;
            const ctx = highResCanvasCtx(canvas);

            const generateMaze = async () => {
                while (!cancelSignal.aborted) {
                    const maze = new Maze(mazeSize, mazeSize);
                    try {
                        await mazeFunction(maze, ctx, cancelSignal, stepTime);
                    } catch (e: unknown) {
                        if (e instanceof Error && e.message.includes("aborted")) {
                            continue;
                        }
                        throw e;
                    }
                }
            };

            generateMaze();
            return () => {
                controller.abort();
            };
        }, [stepTime, mazeSize]);

        return (
            <center key={mazeFunction.name} className="no-select top-bot-padding">
                <canvas ref={canvasRef} width={330} height={330} />
                <div style={{ width: 330, textAlign: 'left' }}>
                    <small> {mazeSize}x{mazeSize} (<a className="cursor" onClick={() => setMazeSize(mazeSize + 1)}>bigger</a>, <a className="cursor" onClick={() => setMazeSize(Math.max(mazeSize - 1, 2))}>smaller</a>) {stepTime}ms
                        (<a className="cursor" onClick={() => setStepTime(Math.max(stepTime - 50, 0))}>faster</a>, <a className="cursor" onClick={() => setStepTime(stepTime + 50)}>slower</a>).
                    </small>
                </div>
                <style jsx>{`
                    .no-select {
                        user-select: none;
                    }
                    .cursor {
                        cursor: pointer;
                    }
                    .top-bot-padding {
                        padding-top: 8px;
                        padding-bottom: 8px;
                    }
                `}</style>
            </center>
        );
    };
}

export const RandomDFS = componentForMaze(randomDFS);
export const AldousBroder = componentForMaze(aldousBroder);
export const WilsonsAlgorithm = componentForMaze(wilsonsAlgorithm);

export const TreeDiameter = () => {
    const mazeCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const mazeCanvas = mazeCanvasRef.current;

        if (!mazeCanvas) return;
        const mazeCtx = highResCanvasCtx(mazeCanvas);

        (async () => {
            while (true) {
                const maze = new Maze(12, 12);
                solveMazeWithRandomDPS(maze)
                renderMaze(maze, null, [], mazeCtx)
                await sleep(1000);
                const { cell1, cell2 } = await findFurthestCells(maze, mazeCtx, 50, true)
                await sleep(2000);
                maze.start = cell1;
                maze.end = cell2;
                renderMaze(maze, null, [], mazeCtx);
                await sleep(2000);
            }
        })();
    }, []);

    return (
        <center key="treeDiameter" className="top-bot-padding">
            <canvas ref={mazeCanvasRef} width={340} height={340} />
            <div style={{ width: 340, textAlign: 'left' }}><small>Finding the start and end cells via tree diameter.</small></div>
            <style jsx>{`
                .top-bot-padding {
                    padding-top: 8px;
                    padding-bottom: 8px;
                }
            `}</style>
        </center>
    );
}

export const IntroMaze = () => {
    const mazeCanvasRef = useRef<HTMLCanvasElement>(null);
    const debugCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const mazeCanvas = mazeCanvasRef.current;
        const debugCanvas = debugCanvasRef.current;

        if (!mazeCanvas || !debugCanvas) return;
        
        const mazeCtx = highResCanvasCtx(mazeCanvas);
        const debugCtx = highResCanvasCtx(debugCanvas);

        (async () => {
            while (true) {
                const maze = new Maze(2, 2);
                const a = maze.getCell(0, 0)
                const b = maze.getCell(1, 0)
                const c = maze.getCell(1, 1)
                const d = maze.getCell(0, 1)
                renderMaze(maze, null, [], mazeCtx)
                renderDebug(maze, null, [], debugCtx)
                await sleep(1000);
                a.carveEdge(b)
                renderMaze(maze, b, [], mazeCtx)
                renderDebug(maze, null, [], debugCtx)
                await sleep(1000);
                b.carveEdge(c)
                renderMaze(maze, c, [], mazeCtx)
                renderDebug(maze, null, [], debugCtx)
                await sleep(1000);
                c.carveEdge(d)
                renderMaze(maze, d, [], mazeCtx)
                renderDebug(maze, null, [], debugCtx)
                await sleep(1000);
                maze.start = a
                maze.end = d
                renderMaze(maze, null, [], mazeCtx)
                renderDebug(maze, null, [], debugCtx)
                await sleep(2000);
            }
        })();
    }, []);

    return (
        <center key="intro" className="top-bot-padding">
            <canvas ref={mazeCanvasRef} width={170} height={170} />
            <canvas ref={debugCanvasRef} width={170} height={170} />
            <div style={{ width: 340, textAlign: 'left' }}><small>Left: user-facing maze view. Right: debug view.</small></div>
            <style jsx>{`
                .top-bot-padding {
                    padding-top: 8px;
                    padding-bottom: 8px;
                }
            `}</style>
        </center>
    );
}
