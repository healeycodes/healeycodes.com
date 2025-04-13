import BitboardVisualizer from "./bitboard-visualizer"
import { BitboardStep } from "./bitboard-visualizer"

const whitePawnAttacks: { codeLines: string[], steps: BitboardStep[] } = {
    codeLines: [
        "// Initial white pawn attacks",
        "FILE_A = 0x0101010101010101n;",
        "FILE_H = 0x8080808080808080n;",
        "white_pawns = 0x000000000000FF00n;",
        "attacks_left  = (white_pawns & ~FILE_A) << 7n;",
        "attacks_right = (white_pawns & ~FILE_H) << 9n;",
        "pawn_attacks  = attacks_left | attacks_right;",
    ],
    steps: (() => {
        const FILE_A = BigInt("0x0101010101010101")
        const FILE_H = BigInt("0x8080808080808080")
        const white_pawns = BigInt("0x000000000000ff00")
        const attacks_left = (white_pawns & ~FILE_A) << BigInt(7)
        const attacks_right = (white_pawns & ~FILE_H) << BigInt(9)
        const pawn_attacks = attacks_left | attacks_right

        return [
            { highlightLines: [2], board: FILE_A },
            { highlightLines: [3], board: FILE_H },
            { highlightLines: [4], board: white_pawns },
            { highlightLines: [5], board: attacks_left },
            { highlightLines: [6], board: attacks_right },
            { highlightLines: [7], board: pawn_attacks },
        ]
    })(),
}

const knightAttack: { codeLines: string[], steps: BitboardStep[] } = {
    codeLines: [
        "// Knight attacks from F5",
        "KNIGHT_POS = 0x0000000004000000n;",
        "attacks = (KNIGHT_POS << 17n) |",
        "  (KNIGHT_POS << 15n) |",
        "  (KNIGHT_POS << 10n & NOT_AB_FILE) |",
        "  (KNIGHT_POS << 6n & NOT_GH_FILE) |",
        "  (KNIGHT_POS >> 17n) |",
        "  (KNIGHT_POS >> 15n) |",
        "  (KNIGHT_POS >> 10n & NOT_AB_FILE) |",
        "  (KNIGHT_POS >> 6n & NOT_GH_FILE);",
    ],
    steps: (() => {
        const KNIGHT_POS = BigInt("0x0000000004000000")
        const NOT_AB_FILE = ~BigInt("0x0303030303030303")  // Correct mask for files A and B
        const NOT_GH_FILE = ~BigInt("0xc0c0c0c0c0c0c0c0")  // Correct mask for files G and H

        const attacks = (KNIGHT_POS << BigInt(17)) |
                       (KNIGHT_POS << BigInt(15)) |
                       (KNIGHT_POS << BigInt(10) & NOT_AB_FILE) |
                       (KNIGHT_POS << BigInt(6) & NOT_GH_FILE) |
                       (KNIGHT_POS >> BigInt(17)) |
                       (KNIGHT_POS >> BigInt(15)) |
                       (KNIGHT_POS >> BigInt(10) & NOT_AB_FILE) |
                       (KNIGHT_POS >> BigInt(6) & NOT_GH_FILE)

        return [
            { highlightLines: [2], board: KNIGHT_POS },
            { highlightLines: [3], board: KNIGHT_POS << BigInt(17) },
            { highlightLines: [4], board: KNIGHT_POS << BigInt(15) },
            { highlightLines: [5], board: KNIGHT_POS << BigInt(10) & NOT_AB_FILE },
            { highlightLines: [6], board: KNIGHT_POS << BigInt(6) & NOT_GH_FILE },
            { highlightLines: [7], board: KNIGHT_POS >> BigInt(17) },
            { highlightLines: [8], board: KNIGHT_POS >> BigInt(15) },
            { highlightLines: [9], board: KNIGHT_POS >> BigInt(10) & NOT_AB_FILE },
            { highlightLines: [10], board: KNIGHT_POS >> BigInt(6) & NOT_GH_FILE },
            { highlightLines: [3, 4, 5, 6, 7, 8, 9, 10], board: attacks },
        ]
    })(),
}

export const KnightAttack = () => {
    return <BitboardVisualizer codeLines={knightAttack.codeLines} steps={knightAttack.steps} />
}

export const WhitePawnAttacks = () => {
    return <BitboardVisualizer codeLines={whitePawnAttacks.codeLines} steps={whitePawnAttacks.steps} />
}
