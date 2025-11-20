import { useEffect, useRef } from "react";
import { Chess, SQUARES } from "chess.js";
import { Chessground } from "chessground";

import type { Api } from "chessground/api";
import type * as CG from "chessground/types";
import type { Square, Move } from "chess.js";

import "./Chessboard.css";

// Props accepted by Chessboard
interface ChessboardProps {
  gameFen?: string;
  onMove?: (from: string, to: string, promotion?: string) => void;
  boardOrientation?: "white" | "black";
  disabled?: boolean;
  aiDepth?: number; // optional; accepted to satisfy other usages
}

export default function Chessboard({
  gameFen,
  onMove,
  boardOrientation = "white",
  disabled = false,
}: ChessboardProps) {
  const gameRef = useRef(new Chess(gameFen));
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);

  useEffect(() => {
    if (!boardRef.current) return;

    const movableColor: "white" | "black" | "both" | undefined = disabled
      ? undefined
      : "both";

    const config = {
      orientation: boardOrientation,
      highlight: {
        lastMove: true,
        check: true,
      },

      animation: {
        enabled: true,
        duration: 250,
      },

      movable: {
        free: false,
        color: movableColor,
        dests: computeDests(gameRef.current),
        showDests: true,
      },

      premovable: {
        enabled: false,
      },

      draggable: {
        enabled: !disabled,
        showGhost: true,
      },

      selectable: {
        enabled: !disabled,
      },

      events: {
        move: (from: CG.Key, to: CG.Key, _metadata?: unknown) => {
          const game = gameRef.current;

          const move = game.move({ from, to, promotion: "q" });
          if (!move) return;

          apiRef.current?.set({
            fen: game.fen(),
            movable: { dests: computeDests(game) },
            turnColor: game.turn() === "w" ? "white" : "black",
            check: game.isCheck(),
          });

          onMove?.(from, to, "q");
        },
      },
    };

    apiRef.current = Chessground(boardRef.current, config);

    apiRef.current.set({
      fen: gameRef.current.fen(),
      orientation: boardOrientation,
      movable: { dests: computeDests(gameRef.current) },
      draggable: { enabled: !disabled },
      turnColor: gameRef.current.turn() === "w" ? "white" : "black",
    } as any);

    return () => apiRef.current?.destroy();
  }, []);

  // Sync board when props change (fen/orientation/disabled)
  useEffect(() => {
    if (!apiRef.current) return;

    if (gameFen) {
      const g = new Chess(gameFen);
      gameRef.current = g;
      apiRef.current.set({
        fen: g.fen(),
        orientation: boardOrientation,
        movable: {
          dests: computeDests(g),
          color: disabled ? undefined : g.turn() === "w" ? "white" : "black",
        },
        draggable: { enabled: !disabled },
        turnColor: g.turn() === "w" ? "white" : "black",
        check: g.isCheck(),
      } as any);
    } else {
      apiRef.current.set({
        orientation: boardOrientation,
        draggable: { enabled: !disabled },
        movable: {
          color: disabled ? undefined : "both",
        },
      } as any);
    }
  }, [gameFen, boardOrientation, disabled]);

  return (
    <div className="chessboard-wrapper">
      <div ref={boardRef} className="chessboard-container"></div>
    </div>
  );
}

// ---------------------------------------------------
// Helper: calculate legal destinations for Chessground
// ---------------------------------------------------

function computeDests(chess: Chess) {
  const dests = new Map<CG.Key, CG.Key[]>();

  (SQUARES as readonly string[]).forEach((sq) => {
    const square = sq as Square;
    const moves = chess.moves({ square, verbose: true }) as unknown as Move[];
    if (moves.length) {
      dests.set(
        square as unknown as CG.Key,
        moves.map((m) => (m as any).to as CG.Key)
      );
    }
  });

  return dests;
}
