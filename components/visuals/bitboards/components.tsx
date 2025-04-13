import BitboardVisualizer from "./bitboard-visualizer"
import { BitboardStep } from "./bitboard-visualizer"

const whitePawnAttacks: { codeLines: string[], steps: BitboardStep[] } = {
    codeLines: [
        "// Initial white pawn attacks",
        "FILE_A = 0x0101010101010101;",
        "FILE_H = 0x8080808080808080;",
        "white_pawns = 0x000000000000FF00;",
        "attacks_left  = (white_pawns & ~FILE_A) << 7;",
        "attacks_right = (white_pawns & ~FILE_H) << 9;",
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
        "// Knight attacks from G5",
        "KNIGHT_POS = 0x0000000002000000;",
        "FILE_A = 0x0101010101010101;",
        "FILE_H = 0x8080808080808080;",
        "FILE_AB = FILE_A | (FILE_A << 1);",
        "FILE_GH = FILE_H | (FILE_H >> 1);",
        "attacks = (KNIGHT_POS << 17 & ~FILE_A) |",
        "  (KNIGHT_POS << 15 & ~FILE_H) |",
        "  (KNIGHT_POS << 10 & ~FILE_AB) |",
        "  (KNIGHT_POS << 6 & ~FILE_GH) |",
        "  (KNIGHT_POS >> 17 & ~FILE_H) |",
        "  (KNIGHT_POS >> 15 & ~FILE_A) |",
        "  (KNIGHT_POS >> 10 & ~FILE_GH) |",
        "  (KNIGHT_POS >> 6 & ~FILE_AB);",
    ],
    steps: (() => {
        const KNIGHT_POS = BigInt("0x0000000002000000")
        const FILE_A = BigInt("0x0101010101010101")
        const FILE_H = BigInt("0x8080808080808080")
        const FILE_AB = FILE_A | (FILE_A << BigInt(1))
        const FILE_GH = FILE_H | (FILE_H >> BigInt(1))

        const attacks = (KNIGHT_POS << BigInt(17) & ~FILE_A) |
                       (KNIGHT_POS << BigInt(15) & ~FILE_H) |
                       (KNIGHT_POS << BigInt(10) & ~FILE_AB) |
                       (KNIGHT_POS << BigInt(6) & ~FILE_GH) |
                       (KNIGHT_POS >> BigInt(17) & ~FILE_H) |
                       (KNIGHT_POS >> BigInt(15) & ~FILE_A) |
                       (KNIGHT_POS >> BigInt(10) & ~FILE_GH) |
                       (KNIGHT_POS >> BigInt(6) & ~FILE_AB)

        return [
            { highlightLines: [2], board: KNIGHT_POS },
            { highlightLines: [3], board: FILE_A },
            { highlightLines: [4], board: FILE_H },
            { highlightLines: [5], board: FILE_AB },
            { highlightLines: [6], board: FILE_GH },
            { highlightLines: [7], board: KNIGHT_POS << BigInt(17) & ~FILE_A },
            { highlightLines: [8], board: KNIGHT_POS << BigInt(15) & ~FILE_H },
            { highlightLines: [9], board: KNIGHT_POS << BigInt(10) & ~FILE_AB },
            { highlightLines: [10], board: KNIGHT_POS << BigInt(6) & ~FILE_GH },
            { highlightLines: [11], board: KNIGHT_POS >> BigInt(17) & ~FILE_H },
            { highlightLines: [12], board: KNIGHT_POS >> BigInt(15) & ~FILE_A },
            { highlightLines: [13], board: KNIGHT_POS >> BigInt(10) & ~FILE_GH },
            { highlightLines: [14], board: KNIGHT_POS >> BigInt(6) & ~FILE_AB },
            { highlightLines: [7, 8, 9, 10, 11, 12, 13, 14], board: attacks },
        ]
    })(),
}

export const KnightAttack = () => {
    return <BitboardVisualizer codeLines={knightAttack.codeLines} steps={knightAttack.steps} />
}

export const WhitePawnAttacks = () => {
    return <BitboardVisualizer codeLines={whitePawnAttacks.codeLines} steps={whitePawnAttacks.steps} />
}
