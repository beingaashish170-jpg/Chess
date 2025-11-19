import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";

import Chessboard from "../components/VoiceGamePage/Chessboard";
import GameHeader from "../components/VoiceGamePage/GameHeader";
import ControlsBar from "../components/VoiceGamePage/ControlsBar";
import OpponentCard from "../components/VoiceGamePage/OpponentCard";
import PlayerCard from "../components/VoiceGamePage/PlayerCard";
import MoveHistory from "../components/VoiceGamePage/MoveHistory";

import { stockfishService } from "../utils/stockfishService";

import "./VoiceGamePage.css";

type GameStatus = "playing" | "check" | "checkmate" | "stalemate" | "draw";

interface Player {
  name: string;
  rating: number;
  time: number;
  isAI?: boolean;
}

const VoiceGamePage: React.FC = () => {
  const navigate = useNavigate();

  // single source of truth for game
  const gameRef = useRef<Chess>(new Chess());
  const [gameFen, setGameFen] = useState<string>(gameRef.current.fen());
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);

  const [soundOn, setSoundOn] = useState(true);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
    "white"
  );

  const [opponent] = useState<Player>({
    name: "Stockfish AI",
    rating: 1923,
    time: 60,
    isAI: true,
  });

  const [player] = useState<Player>({
    name: "You",
    rating: 1847,
    time: 60,
  });

  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init Stockfish once
  useEffect(() => {
    const initEngine = async () => {
      try {
        await stockfishService.initialize();
        console.log("Stockfish ready");
      } catch (e) {
        console.error("Error initializing Stockfish:", e);
      }
    };
    initEngine();

    return () => {
      stockfishService.terminate();
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, []);

  const updateGameStatus = (game: Chess) => {
    if (game.isCheckmate()) setGameStatus("checkmate");
    else if (game.isStalemate()) setGameStatus("stalemate");
    else if (game.isDraw()) setGameStatus("draw");
    else if (game.isCheck()) setGameStatus("check");
    else setGameStatus("playing");
  };

  const getStatusText = () => {
    if (isAIThinking) return "🤖 AI is thinking...";
    if (gameStatus === "checkmate") return "👑 Checkmate!";
    if (gameStatus === "stalemate") return "⚖️ Stalemate";
    if (gameStatus === "draw") return "🤝 Draw";
    if (gameStatus === "check") return "⚠️ Check!";
    return gameRef.current.turn() === "w" ? "👤 Your turn" : "🤖 AI's turn";
  };

  // --------- PLAYER MOVE ----------
  const makePlayerMove = (from: string, to: string, promotion?: string) => {
    console.log("Player tries:", from, "->", to);

    const game = new Chess(gameRef.current.fen());
    const move = game.move({
      from,
      to,
      promotion: promotion || "q",
    });

    if (!move) {
      console.warn("Invalid player move");
      return;
    }

    console.log("Player move SAN:", move.san);

    gameRef.current = game;
    setGameFen(game.fen());
    setMoveHistory((prev) => [...prev, move.san]);
    updateGameStatus(game);

    if (game.isGameOver()) {
      setIsAIThinking(false);
      return;
    }

    setIsAIThinking(true);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    aiTimeoutRef.current = setTimeout(() => {
      makeAIMove();
    }, 700);
  };

  // --------- AI MOVE ----------
  const makeAIMove = async () => {
    try {
      const game = new Chess(gameRef.current.fen());
      const fen = game.fen();
      console.log("AI thinking from FEN:", fen);

      const bestMove = await stockfishService.getBestMove(fen, 8);

      if (!bestMove) {
        console.warn("No best move, using random");
        makeRandomAIMove();
        return;
      }

      const move = game.move({
        from: bestMove.from,
        to: bestMove.to,
        promotion: bestMove.promotion || "q",
      });

      if (!move) {
        console.warn("Engine move invalid, using random");
        makeRandomAIMove();
        return;
      }

      console.log("AI move SAN:", move.san);

      gameRef.current = game;
      setGameFen(game.fen());
      setMoveHistory((prev) => [...prev, move.san]);
      updateGameStatus(game);
      setIsAIThinking(false);
    } catch (e) {
      console.error("AI move error:", e);
      makeRandomAIMove();
    }
  };

  const makeRandomAIMove = () => {
    const game = new Chess(gameRef.current.fen());
    const moves = game.moves({ verbose: true });

    if (moves.length === 0) {
      updateGameStatus(game);
      setIsAIThinking(false);
      return;
    }

    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    const move = game.move(randomMove);
    if (move) {
      console.log("AI random move SAN:", move.san);
      gameRef.current = game;
      setGameFen(game.fen());
      setMoveHistory((prev) => [...prev, move.san]);
      updateGameStatus(game);
    }

    setIsAIThinking(false);
  };

  // --------- UNDO ----------
  const handleUndo = () => {
    const game = new Chess(gameRef.current.fen());
    if (game.history().length === 0) return;

    // Undo AI move (if there is one)
    game.undo();
    // Undo player move (if there is one)
    if (game.history().length > 0) game.undo();

    gameRef.current = game;
    setGameFen(game.fen());
    setMoveHistory((prev) => prev.slice(0, -2));
    updateGameStatus(game);
    setIsAIThinking(false);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
  };

  // --------- BOARD DISABLED LOGIC ----------
  // You always play white here
  const isBoardDisabled =
    isAIThinking ||
    gameRef.current.isGameOver() ||
    gameRef.current.turn() !== "w";

  return (
    <div className="voice-game-page">
      <GameHeader
        onBack={() => {
          sessionStorage.removeItem("gameConfig");
          navigate("/home");
        }}
      />

      <div className="game-title-bar">
        <h2 className="game-title">🤖 Simple AI Chess Game</h2>
        <p className="game-subtitle">{getStatusText()}</p>
      </div>

      <div className="main-content">
        <div className="left-section">
          <div className="board-container">
            <div className="chessboard-area">
              <Chessboard
                gameFen={gameFen}
                onMove={makePlayerMove}
                boardOrientation={boardOrientation}
                disabled={isBoardDisabled}
              />
            </div>

            <ControlsBar
              onFlipBoard={() =>
                setBoardOrientation((prev) =>
                  prev === "white" ? "black" : "white"
                )
              }
              soundOn={soundOn}
              onToggleSound={() => setSoundOn((prev) => !prev)}
              onUndo={handleUndo}
              isGameOver={gameRef.current.isGameOver()}
            />
          </div>
        </div>

        <div className="right-sidebar">
          <OpponentCard player={opponent} isThinking={isAIThinking} />
          <PlayerCard
            player={player}
            isYourTurn={
              !isAIThinking &&
              !gameRef.current.isGameOver() &&
              gameRef.current.turn() === "w"
            }
          />
          <MoveHistory moves={moveHistory} />
        </div>
      </div>
    </div>
  );
};

export default VoiceGamePage;
