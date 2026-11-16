// Diagrams for posts/introducing-the-worlds-strongest-sokoban-solver.md
//
// Embed in the post with:  <div className="sokoban" id="sokoban101"></div>
//
//   engine.ts          tiny Sokoban engine that keeps every board legal
//   check*.ts          `node components/visuals/sokoban/check.ts` (and check.<file>.ts) verify boards + solutions
//   data.ts            hand-editable numbers (FINAL = benchmark results, PROVISIONAL = project stats) and boards
//   data.generated.ts  bulk chart series, regenerated from the solver repo
//   data.<file>.ts     boards and numbers for <file>.tsx
//   ui.tsx             board renderer, hooks, styles
//   boards.tsx         board diagrams      charts.tsx  charts and schematics
//   boards2/boards3/fess/lanes2/process.tsx  more diagrams, each exporting a VISUALS map
//
// Board tiles: "Lager" skin by Borgar Thorsteinsson, https://github.com/borgar/sokoban-skins (CC BY 3.0).

import React from 'react';
import { DeadSquares, Deadlocks, Factoring, Relay, MeetInTheMiddle, PushesNotSteps, SearchTree, Sokoban101 } from './boards';
import { AgentMap, ClosingTheGap, LaneSchematic, LanesTogether, LeadByLimit, SolvedByTime, SpeedScatter } from './charts';

import { VISUALS as BOARDS2 } from './boards2';
import { VISUALS as BOARDS3 } from './boards3';
import { VISUALS as FESS } from './fess';
import { VISUALS as LANES2 } from './lanes2';
import { VISUALS as PROCESS } from './process';

export const SOKOBAN_VISUALS: Record<string, React.ComponentType> = {
    solvedByTime: SolvedByTime,
    speedScatter: SpeedScatter,
    sokoban101: Sokoban101,
    pushesNotSteps: PushesNotSteps,
    deadSquares: DeadSquares,
    deadlocks: Deadlocks,
    searchTree: SearchTree,
    meetInTheMiddle: MeetInTheMiddle,
    laneSchematic: LaneSchematic,
    lanesTogether: LanesTogether,
    closingTheGap: ClosingTheGap,
    agentMap: AgentMap,
    factoring: Factoring,
    relay: Relay,
    leadByLimit: LeadByLimit,
    ...BOARDS2,
    ...BOARDS3,
    ...FESS,
    ...LANES2,
    ...PROCESS,
};

export function SokobanVisual({ id }: { id: string }) {
    const Visual = SOKOBAN_VISUALS[id];
    return Visual ? <Visual /> : null;
}
