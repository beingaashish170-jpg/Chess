import React, { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import "./ChessboardArea.css";

interface ChessboardAreaProps {
  game: Chess;
  onMove: (from: string, to: string) => void;
  boardOrientation: "white" | "black";
}

const ChessboardArea: React.FC<ChessboardAreaProps> = ({
  game,
  onMove,
  boardOrientation,
}) => {
  const [highlightedSquares, setHighlightedSquares] = useState<{
    [key: string]: any;
  }>({});
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const onSquareClick = (square: string) => {
    if (!selectedSquare) {
      const piece = game.get(square as any);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square: square as any, verbose: true });
        const newHighlights: { [key: string]: any } = {};
        moves.forEach((move) => {
          newHighlights[move.to] = {
            background:
              "radial-gradient(circle, rgba(254, 207, 3, 0.4) 25%, transparent 25%)",
            borderRadius: "50%",
          };
        });
        newHighlights[square] = { background: "rgba(254, 207, 3, 0.6)" };
        setHighlightedSquares(newHighlights);
      }
    } else {
      try {
        if (selectedSquare !== square) {
          onMove(selectedSquare, square);
        }
      } catch (e) {
        // Invalid move
      }
      setSelectedSquare(null);
      setHighlightedSquares({});
    }
  };

  // react-chessboard onPieceDrop signature: (source, target, piece?) => boolean
  const onDrop = (
    sourceSquare: string,
    targetSquare: string,
    _piece?: string
  ) => {
    try {
      if (sourceSquare === targetSquare) return false;
      onMove(sourceSquare, targetSquare);
      setSelectedSquare(null);
      setHighlightedSquares({});
      return true;
    } catch (e) {
      return false;
    }
  };

  return (
    <div className="chessboard-area">
      <Chessboard
        {...({
          position: game.fen(),
          onSquareClick: onSquareClick,
          onPieceDrop: onDrop,
          onPieceDragBegin: (source: string) => setSelectedSquare(source),
          boardOrientation: boardOrientation,
          customSquareStyles: highlightedSquares,
          boardWidth: 600,
          arePiecesDraggable: true,
        } as any)}
      />
    </div>
  );
};

export default ChessboardArea;
