import React, { useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { Config } from "chessground/config";

interface ChessgroundBoardProps {
  game: Chess;
  onMove: (from: string, to: string) => void;
  orientation?: "white" | "black";
  disabled?: boolean;
}

const Chessboard: React.FC<ChessgroundBoardProps> = ({
  game,
  onMove,
  orientation = "white",
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<Api | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config: Config = {
      fen: game.fen(),
      orientation,
      movable: {
        // Chessground only accepts "white" | "black"
        color: disabled ? undefined : game.turn() === "w" ? "white" : "black",
        free: false,
        events: {
          after: (orig, dest) => onMove(orig, dest),
        },
      },
    };

    apiRef.current = Chessground(containerRef.current, config);

    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!apiRef.current) return;

    apiRef.current.set({
      fen: game.fen(),
      orientation,
      movable: {
        color: disabled ? undefined : game.turn() === "w" ? "white" : "black",
      },
    });
  }, [game.fen(), orientation, disabled]);

  return <div ref={containerRef} style={{ width: "480px", height: "480px" }} />;
};

export default Chessboard;
