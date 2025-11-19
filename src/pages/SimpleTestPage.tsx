// src/pages/SimpleTestPage.tsx
import React, { useRef, useState } from "react";
import { Chess } from "chess.js";
import ChessgroundBoard from "../components/VoiceGamePage/Chessboard";

const SimpleTestPage: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const gameRef = useRef(game);
  gameRef.current = game;

  const handleMove = (from: string, to: string) => {
    const newGame = new Chess(gameRef.current.fen());
    const move = newGame.move({ from, to, promotion: "q" });

    if (!move) {
      console.warn("Illegal move", from, to);
      return;
    }

    setGame(newGame);
  };

  return (
    <div
      style={{
        padding: 20,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ChessgroundBoard
        game={game}
        onMove={handleMove}
        orientation="white"
        disabled={false}
      />
    </div>
  );
};

export default SimpleTestPage;
