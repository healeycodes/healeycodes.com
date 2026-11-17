// Hand-editable numbers and boards for the Sokoban post diagrams.
// Bulk series (scatter, curves) live in data.generated.ts.

// ---------------------------------------------------------------------------
// FINAL  FINAL  FINAL
// The final benchmark (soksolv bench/RESULTS-2026-11-15.md and
// research/blog-post/data/final-bench.json): both solvers on the same hardware,
// 8 pinned cores + 15 GB each, 600 s limit, every solution verified.
//
// `solved`: ours = the final run (bench/2026-11-14b); the 1 s / 10 s / 60 s counts
// are read off the solver's reported times inside that 600 s run.
// festival = Festival 3.1 MEASURED by us on the same hardware (bench/2026-11-14 plus
// the solved 2026-11-15 retries; it reports whole seconds), like for like with ours.
// Its published 600 s counts are 3,208 LTS / 9,595 OTS; no diagram uses them.
// The other rivals' counts are PUBLIC statistics (Sokoban Solver Statistics,
// 2026-04-28, 10 minute limit, AMD Ryzen 9 7900X); their shorter limits come from
// per-level times rounded to whole seconds (soksolv ledger, same as CURVES in
// data.generated.ts, where the Festival curve is the measured one too).
// `festivalMeasured`: the same Festival numbers by limit (check.process.ts keeps the two equal).
// ---------------------------------------------------------------------------
export const FINAL = {
    suites: {
        lts: { name: 'Large Test Suite', levels: 3272 },
        ots: { name: 'Open Test Suite', levels: 10043 },
    },
    // solved[suite][time limit in seconds][solver]
    solved: {
        lts: {
            1: { ours: 2806, festival: 2179, sokolution: 2754, takaken: 2309, yass: 2215, boxsearch: 1766 },
            10: { ours: 3074, festival: 2864, sokolution: 2990, takaken: 2677, yass: 2410, boxsearch: 2354 },
            60: { ours: 3152, festival: 3000, sokolution: 3100, takaken: 2881, yass: 2525, boxsearch: 2569 },
            600: { ours: 3218, festival: 3208, sokolution: 3207, takaken: 2953, yass: 2899, boxsearch: 2748 },
        },
        ots: {
            1: { ours: 8294, festival: 6040, sokolution: 7837, takaken: 6751, yass: 6393, boxsearch: 5161 },
            10: { ours: 9047, festival: 8419, sokolution: 8703, takaken: 7891, yass: 6981, boxsearch: 6914 },
            60: { ours: 9380, festival: 8885, sokolution: 9101, takaken: 8495, yass: 7335, boxsearch: 7569 },
            600: { ours: 9622, festival: 9602, sokolution: 9515, takaken: 8720, yass: 8338, boxsearch: 8110 },
        },
    },
    // Festival 3.1 measured head to head (Festival reports whole seconds).
    festivalMeasured: {
        lts: { 1: 2179, 10: 2864, 60: 3000, 600: 3208 },
        ots: { 1: 6040, 10: 8419, 60: 8885, 600: 9602 },
    },
    // The two full benchmark runs of our solver (bench/2026-11-14 and bench/2026-11-14b), end times UTC.
    firstRun: { lts: 3217, ots: 9594, end: '2026-11-14T12:31' },
    finalRun: { lts: 3218, ots: 9622, end: '2026-11-15T02:00' },
    // Head to head on the 9,756 distinct boards.
    boards: { distinct: 9756, ours: 9341, festival: 9321, both: 9223, oursOnly: 118, festivalOnly: 98, oursFaster: 8811, firstEver: 24 },
    medianS: { ours: 0.048, festival: 1 },
    meanBothS: { ours: 4.32, festival: 14.16 },
};

// ---------------------------------------------------------------------------
// PROVISIONAL (project statistics, not benchmark results): from the 2026-11-14
// snapshot of the solver repo.
// ---------------------------------------------------------------------------
export const PROVISIONAL = {
    ourName: 'soksolv', // TODO(andrew): final solver name

    // Each lane run alone vs. the whole portfolio, on three LTS levels.
    // Local runs of bin/incumbent (7d19656f9) on an 8-core MacBook, one run each,
    // `-strategy LANE -t 6 -mem 2048` (Holland: -t 10) vs. the default portfolio.
    // Seconds to solve; null = no solution inside the limit.
    laneLimit: 6,
    laneRuns: [
        {
            level: 'Holland #68',
            note: 'Festival 154 s, Sokolution 32 s',
            together: 3.8,
            alone: { macro: null, novelty: null, fa2: null, 'hub-pull': null, 'hub-gen': null, pull: null, reverse: null },
        },
        {
            level: 'SokHard #100',
            note: 'Festival 31 s',
            together: 1.8,
            alone: { macro: null, novelty: null, fa2: null, 'hub-pull': null, 'hub-gen': null, pull: null, reverse: 3.3 },
        },
        {
            level: 'Grigr2002 #28',
            note: 'Festival 4 s',
            together: 1.3,
            alone: { macro: 4.3, novelty: 3.5, fa2: 0.9, 'hub-pull': null, 'hub-gen': 4.5, pull: null, reverse: 1.7 },
        },
    ] as { level: string; note: string; together: number; alone: Record<string, number | null> }[],
};

export const SOLVERS: { id: string; name: string }[] = [
    { id: 'ours', name: PROVISIONAL.ourName },
    { id: 'festival', name: 'Festival' },
    { id: 'sokolution', name: 'Sokolution' },
    { id: 'takaken', name: 'Takaken' },
    { id: 'yass', name: 'YASS' },
    { id: 'boxsearch', name: 'BoxSearch' },
];

// ---------------------------------------------------------------------------
// Boards. '#' wall, '@' player, '$' box, '.' goal, '*' box on goal, '+' player on goal.
// ---------------------------------------------------------------------------

// Microban #1 (David W. Skinner)
export const MICROBAN_1 = `
####
# .#
#  ###
#*@  #
#  $ #
#  ###
####`;

// Microban #5 (David W. Skinner)
export const MICROBAN_5 = `
 #######
 #     #
 # .$. #
## $@$ #
#  .$. #
#      #
########`;

// Holland #68 (David Holland, "maelstrom"), level 68 of the Large Test Suite's Holland set
export const HOLLAND_68 = `
       ####
 #######  #
 #  ##  $ ##
 # $    $  #
 # ###$#$# ####
## ##  .$..#  #
#   #  .$.    #
# $  # #####$ #
##$  #$...    #
 #@. .$..* ####
 ###########`;

// The solver's own answer for Holland #68: 1,559 moves, 261 pushes, found in 3.8 s
// by a local run of bin/incumbent (lowercase = walk, uppercase = push).
export const HOLLAND_68_SOLUTION =
    'ruuuluuuRldddrdddrrRUUdrrrrrrruullluuulLrrdddrrrddllllllldlluululldRurDrddllUdrruululldRddrrrruuUrRRRllllddrrrrrrUdlllllluuruRdrruuullDDRlldldddlluuLrddrrurrrrrruruulDDrdLLLLLdLLuuururrdrRllulldldddrrurrrruruulDlllulldlluRRRldldddrrurrrrruulllUdlLuuurrDDuulldddrRRluuuluulDrdrdddllullddddLLrrrrurrrrruuLLLuuulullldDDrruUruLdddlluuRlddrruUrrdddrrrddllllldlluuUUddddlluululuuurRRRRllllldddrdrddrruuuurrdRRuuulLddRdrUllllddddrrurrrrruulLLulldLurrrdrrrddllllldlluuUluRRRdlldddrrurrrrruulllLLLulDrrrrrrrddllllldlluUUruruuLLLrrrruulDDDDldldddrrurrrrruullllLrrrrrddllllldlllluululuuurRRRRllllldddrdrddrrrrurrrrruullllluuUdddrrrrDulllluuulllllldddrdrddrruuuluRddddlluululuuurrrrrrdddrrrrdrdLLLdLLLLuuuRRRRRllllldddrrrrurruruulDlllluuurrDDuulldddrRRllllluRdrUdlldddrrrrurrruuLLLLLLulDrrrruuullDulllllldddrdrddRRRRlluUUluRUdddddlluululuuurrrRRRlldddrrrruuuLLLLLLrrdddrrUdlldddlluululldRuuuuRRRRRRlldddrruLdrrruuuLLLLLLLrrrrrDurrdddlllldddrruRRRllldlluuurrrrrrrddLruulllllUdrruuulllllllulDDurrrrrrDurrdddlllldddlluuLrddrrrrurrRllldlluuurrUUddrruuulLrrddLdlUdllluRRdldddlluululldRddRRuuLrddlluRuulUUddDrddrRRRluuurrrrrrrddLLLLrrrruulllllluluuRldddrrruLdlluuurRlldddrrurruuLLrrdddlllluuulllulDDDDuuurrrrdddrrurruullLLLLrrdddrruLdlUrrrruullDurrdddllluRRdllldddllluuuluuuRRRRDDDurruuruulDDDDrdLulluuRlddrruUlllllldddrdddrrruUUUrrdLuruulllllldddrdddrrruuUluRRRuullDDDuuulllldddrdddrrruUUdddllluuulldRurDuluuurrrrrrdddlldddllllUUrDldRRRRuuururuullllllddDldRurDrDullddrRuulDuuluuurrrrrrdddllluRdrrrrrrDrdLLLrruulllluuuruulDrdLdddlluuuuRlddddrruuuruulDDDDuuullddddrRuuuLulDDDldR';

// Hand-made boards for the mechanism diagrams.
// d07 from soksolv research/blog-post/data/boards.xsb: three boxes fence off the right-hand side
export const REACH_BOARD = `
#########
#   $ . #
# $@$ . #
#.  $ . #
#########`;

export const DEADLOCK_BOARDS = [
    {
        title: 'Corner',
        text: 'No side to push from.',
        dead: [[1, 3]],
        board: `
#####
#. @#
#   #
#$  #
#####`,
    },
    {
        // d09 from soksolv research/blog-post/data/boards.xsb
        title: 'Two boxes, one goal',
        text: 'Both can only slide along the wall.',
        dead: [
            [1, 2],
            [1, 3],
        ],
        board: `
#######
#.   .#
#$ $  #
#$ @  #
#    .#
#######`,
    },
    {
        title: 'Frozen pair',
        text: 'Each box blocks the other.',
        dead: [
            [2, 3],
            [3, 3],
        ],
        board: `
######
#.. @#
#    #
# $$ #
######`,
    },
    {
        title: 'Two by two',
        text: 'Frozen in open floor.',
        dead: [
            [2, 2],
            [3, 2],
            [2, 3],
            [3, 3],
        ],
        board: `
######
#.  .#
# $$ #
# $$@#
#.  .#
######`,
    },
];

// Layer sizes for Microban #5, computed by engine.layers() and pinned here so the
// page doesn't redo a 6,000-state search on load. check.ts asserts they match.
export const MICROBAN_5_LAYERS = {
    fwd: [1, 4, 50, 262, 859, 1892, 2951],
    back: [1, 1, 3, 11, 36, 81, 106],
};

// d04, d05, d08 from soksolv research/blog-post/data/boards.xsb, with the solutions
// verified there (and again by check.ts).
export const GOAL_BAY = `
#########
####    #
#...  $ #
#### $$ #
#   @   #
#########`;
export const GOAL_BAY_SOLUTION = 'rrruuLLLLLrrddrUdrruulLLLrddrrUruLLL';

// relay: a small hand-made bay (solution from engine solve(), checked by check.ts).
export const RELAY_BOARD = `
#######
#  #..#
# $$ .#
#  $  #
# @   #
#######`;
export const RELAY_SOLUTION = 'uRRdrUUdlllluurDRdrUddllUluRRR';
export const RELAY_AT = 7; // moves played before the relay freezes the finished box

export const TWO_ROOMS = `
############
#.$ #### $.#
#   @      #
############`;
export const TWO_ROOMS_SOLUTION = 'rrrruRdlllllluL';

export const HUB_BOARD = `
########
#.  #  #
#  $$  #
#.$  @.#
#      #
########`;
export const HUB_SOLUTION = 'dlllluRRRRllluurDlddrruLdlUUruLddrrruLdlluurDrdLL';
