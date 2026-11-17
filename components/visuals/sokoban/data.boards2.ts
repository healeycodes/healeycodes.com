// Boards and move strings for the "Sokoban intuition" diagrams in boards2.tsx.
// Every board and line here is replayed and checked by check.boards2.ts:
//   node components/visuals/sokoban/check.boards2.ts

// ---------------------------------------------------------------------------
// PROVISIONAL  PROVISIONAL  PROVISIONAL
// Source: soksolv research/blog-post/boxes-on-goals.md (ledger/levels.tsv, distinct
// distinct boards counted 2026-11-14; denominator set to the benchmark's 9,756 real distinct boards).
// ---------------------------------------------------------------------------
export const PROVISIONAL_BOARDS2 = {
    nearPacked: { boards: 1106, of: 9756 }, // boards that start with >= 75% of boxes on goals
};

// greedyTrap: found by a small random search over boards <= 8x6 for a level where
// the greedy rule "most boxes on goals, ties broken by the smaller sum of
// nearest-goal distances" has one clear best push that freezes the board, while the
// shortest solution starts by pushing a box away from the goals.
export const GREEDY_BOARD = `
#######
#. #  #
# $   #
#@.$  #
#######`;
// The greedy line: the only push that puts a box on a goal. Both boxes freeze
// against the bottom wall. check.boards2.ts recomputes it with the greedy rule.
export const GREEDY_LINE = 'uurD';
// Shortest solution (5 pushes), from engine solve().
export const GREEDY_SOLUTION = 'rRuLdlUrrrrdLL';

// boxesOnGoals: found by a random search over small boards (4 boxes, 3 of them
// starting on goals) for one where the shortest solution takes two boxes off their
// goals before any box goes on. Solution from engine solve(), shortest in pushes.
// check.boards2.ts replays it and proves that both of those boxes have to leave.
export const ON_GOAL_BOARD = `
#########
#  #    #
#. #@#$ #
#     * #
# *   * #
#########`;
export const ON_GOAL_SOLUTION = 'urrrddLruulllddllldRurruurrrddlLLuurrDullddLLdlUrrrdL';
export const ON_GOAL_SERIES = [3, 2, 1, 1, 1, 2, 2, 2, 3, 4]; // boxes on goals after each push

// macroTunnel: d03 from boards.xsb.
export const TUNNEL_BOARD = `
###########
#   ###   #
# $     . #
#  @###   #
###########`;
export const TUNNEL_SOLUTION = 'lluRRRRRR';

// goalRoom: a wrong-order line on GOAL_BAY (data.ts). The first box stops on the
// nearest goal, the bay's entrance; the next box can only get as far as the door.
// While the parked box stays on its goal the two deeper goals are sealed off (the
// position itself is not dead: the parked box could still be pushed deeper).
export const GOAL_BAY_WRONG = 'rrruuLLLrrrddllUdrruulL';
