import { useEffect, useState } from "react"
import Code from "../../code"

export interface BitboardStep {
    highlightLines: number[] // Which lines of code to highlight (1-based)
    board: bigint | string // Bitboard after this step (64-bit integer)
}

interface BitboardVisualizerProps {
    codeLines: string[] // Static array of code lines (shown left-side)
    steps: BitboardStep[] // Step-by-step transitions (each step updates the board and highlights lines)
    stepDelay?: number // Optional delay between steps (ms), default = 2000
}

export default function BitboardVisualizer({ codeLines, steps, stepDelay = 2000 }: BitboardVisualizerProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [bitIndices, setBitIndices] = useState<number[]>([])

    // Ensure we have valid steps and a valid current step
    const currentStep = steps && steps.length > 0 ? steps[currentStepIndex] : { highlightLines: [], board: BigInt(0) }
    const boardValue =
        currentStep && typeof currentStep.board === "string" ? BigInt(currentStep.board) : currentStep?.board || BigInt(0)

    // Convert bitboard to binary string (padded to 64 bits)
    const binaryString = boardValue.toString(2).padStart(64, "0")
    // Split binary string into groups of 8 bits with spaces between
    const formattedBinary = binaryString.match(/.{1,8}/g)?.join(" ") || binaryString

    // Calculate which bits are set (1)
    useEffect(() => {
        const indices: number[] = []
        const boardValueBigInt = typeof boardValue === 'string' ? BigInt(boardValue) : boardValue
        for (let i = 0; i < 64; i++) {
            if ((boardValueBigInt & (BigInt(1) << BigInt(i))) !== BigInt(0)) {
                indices.push(i)
            }
        }
        setBitIndices(indices)
    }, [boardValue])

    // Auto-advance steps
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentStepIndex((prevIndex) => (prevIndex + 1) % steps.length)
        }, stepDelay)

        return () => clearTimeout(timer)
    }, [currentStepIndex, stepDelay, steps.length])

    // Check if a bit is set at a specific position
    const isBitSet = (position: number) => {
        const boardValueBigInt = typeof boardValue === 'string' ? BigInt(boardValue) : boardValue
        return (boardValueBigInt & (BigInt(1) << BigInt(position))) !== BigInt(0)
    }

    // Get file letter (A-H) from column index (0-7)
    const getFile = (col: number) => String.fromCharCode(72 - col) // H to A (reversed)

    // Get rank number (1-8) from row index (0-7)
    const getRank = (row: number) => 8 - row // 8 to 1 (reversed)

    return (
        <div className="visualizer-container">
            {/* Main content - responsive layout */}
            <div className="visualizer-content">
                {/* Left side - Code display */}
                <pre>
                    <Code options={{ highlightLines: currentStep?.highlightLines.map(line => line - 1) }}
                        language="javascript"
                        children={codeLines.join("\n")}
                    />
                </pre>

                <div className="board-container">
                    <div className="chessboard">

                        {/* Chessboard view */}
                        <div className="board-grid">
                            {Array.from({ length: 64 }).map((_, index) => {
                                const row = Math.floor(index / 8)
                                const col = index % 8
                                const position = row * 8 + col
                                const isDarkSquare = (row + col) % 2 === 1
                                const bitValue = isBitSet(position)

                                return (
                                    <div
                                        key={index}
                                        className={
                                            isDarkSquare
                                                ? bitValue
                                                    ? "square dark-square bit-set"
                                                    : "square dark-square"
                                                : bitValue
                                                    ? "square light-square bit-set"
                                                    : "square light-square"
                                        }
                                    >
                                        <div className={bitValue ? "bit-overlay visible" : "bit-overlay"} />
                                        <span className="square-coord">
                                            {getFile(col)}
                                            {getRank(row)}
                                        </span>
                                        <span className="square-index">{position}</span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Bitboard representations */}
                        <div className="bitboard-info">
                            <div className="info-item">
                                <span className="info-label">Binary: </span>
                                <span className="info-value binary">{formattedBinary}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Set bits: </span>
                                <span className="info-value">{bitIndices.length > 0 ? bitIndices.join(", ") : "none"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .visualizer-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .visualizer-content {
          display: block;
        }

        .code-line.highlighted {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding-left: 0.5rem;
        }

        .board-container {
          width: 100%;
          margin-top: 0.1rem;
        }

        .chessboard {
          aspect-ratio: 1 / 1;
          width: 100%;
          max-width: 448px;
          margin: 0 auto;
        }

        .board-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          height: 100%;
        }

        .square {
          position: relative;
          display: block;
          border: 1px solid #e5e7eb;
        }

        .light-square {
          background-color: white;
        }

        .dark-square {
          background-color: #d1d5db;
        }

        .bit-set {
          box-shadow: inset 0 0 0 2px #3b82f6;
        }

        .bit-overlay {
          position: absolute;
          inset: 0;
          display: block;
          transition: opacity 0.5s;
          background-color: rgba(59, 130, 246, 0.5);
          opacity: 0;
        }

        .bit-overlay.visible {
          opacity: 1;
        }

        .square-coord {
          font-size: 0.75rem;
          opacity: 0.5;
          position: absolute;
          top: 2px;
          left: 2px;
        }

        .square-index {
          font-size: 0.75rem;
          opacity: 0.5;
          position: absolute;
          bottom: 2px;
          right: 2px;
        }

        .bitboard-info {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.875rem;
          width: 100%;
          max-width: 448px;
          margin-left: auto;
          margin-right: auto;
        }

        .info-item {
          padding: 0.5rem;
          background-color: #f9fafb;
          border-radius: 0.25rem;
        }

        .info-item.binary {
          overflow-x: auto;
        }

        .info-value {
          white-space: normal;
        }

        .info-value.binary {
          overflow-x: auto;
        }
      `}</style>
        </div>
    )
}
